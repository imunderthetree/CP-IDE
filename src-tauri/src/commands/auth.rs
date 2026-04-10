// commands/auth.rs — Unified WebView login + credential storage for all platforms.
//
// Opens a WebView popup to the platform's login page, polls for the session cookie
// using Tauri's native cookies_for_url() API, stores it in Windows Credential Manager
// via the keyring crate, and emits a Tauri event when login is complete.
//
// WebView2 on Windows shares cookies with Microsoft Edge. This means:
// - If the user is already logged in via Edge, the cookie is immediately available
// - We must track the initial cookie value and only accept CHANGED values (fresh login)

use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

// ─── Platform Configuration ──────────────────────────────────────────────────

struct PlatformAuth {
    login_url: &'static str,
    cookie_name: &'static str,
    cookie_url: &'static str,
    credential_key: &'static str,
    display_name: &'static str,
}

fn get_platform_auth(platform: &str) -> Result<PlatformAuth, String> {
    match platform {
        "leetcode" => Ok(PlatformAuth {
            login_url: "https://leetcode.com/accounts/login/",
            cookie_name: "LEETCODE_SESSION",
            cookie_url: "https://leetcode.com",
            credential_key: "cpide_leetcode_session",
            display_name: "LeetCode",
        }),
        "hackerrank" => Ok(PlatformAuth {
            login_url: "https://www.hackerrank.com/auth/login",
            cookie_name: "_hrank_session",
            cookie_url: "https://www.hackerrank.com",
            credential_key: "cpide_hackerrank_session",
            display_name: "HackerRank",
        }),
        _ => Err(format!("Unknown platform: {}", platform)),
    }
}

// ─── Keyring Helpers ──────────────────────────────────────────────────────────

fn store_credential(key: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new("cp-ide", key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry
        .set_password(value)
        .map_err(|e| format!("Failed to store credential: {}", e))
}

fn read_credential(key: &str) -> Result<String, String> {
    let entry = keyring::Entry::new("cp-ide", key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry
        .get_password()
        .map_err(|_| "Not connected".to_string())
}

fn delete_credential(key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new("cp-ide", key)
        .map_err(|e| format!("Keyring error: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete credential: {}", e)),
    }
}

// ─── Cookie Helper ────────────────────────────────────────────────────────────

/// Try to read a specific cookie from the WebView2 shared cookie store
/// by creating a temporary hidden webview, reading its cookies, then closing it.
fn get_existing_cookie(app: &tauri::AppHandle, cookie_url: &str, cookie_name: &str) -> Option<String> {
    // We can't easily read cookies without a webview, so return None.
    // The polling loop handles this by tracking initial values.
    let _ = (app, cookie_url, cookie_name);
    None
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Open a WebView window to the platform's login page.
/// Polls for the session cookie every 500ms. When found (and different from
/// any pre-existing cookie), stores it in Windows Credential Manager and
/// emits 'platform_connected' event. Times out after 5 minutes.
#[tauri::command]
pub async fn open_login_window(
    app: tauri::AppHandle,
    platform: String,
) -> Result<(), String> {
    let auth = get_platform_auth(&platform)?;

    let window_label = format!("{}_login", platform);

    // Close existing login window if any
    if let Some(existing) = app.get_webview_window(&window_label) {
        let _ = existing.close();
    }

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(
            auth.login_url
                .parse()
                .map_err(|e: url::ParseError| format!("Invalid URL: {}", e))?,
        ),
    )
    .title(format!("Sign in to {}", auth.display_name))
    .inner_size(500.0, 700.0)
    .resizable(true)
    .center()
    // Allow navigation to ANY URL — needed for Google/GitHub/Facebook OAuth flows
    .on_navigation(|_url| true)
    // Inject JS on every page load to fix OAuth popups.
    // WebView2 blocks window.open() by default, so we redirect to same-window navigation.
    .initialization_script(r#"
        // Override window.open to navigate in current window (fixes OAuth popups)
        window.open = function(url) {
            if (url) window.location.href = url;
            return window;
        };
        // Convert target="_blank" links to same-window
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a[target="_blank"]').forEach(function(a) {
                a.target = '_self';
            });
            // MutationObserver for dynamically added links
            new MutationObserver(function(mutations) {
                mutations.forEach(function(m) {
                    m.addedNodes.forEach(function(node) {
                        if (node.querySelectorAll) {
                            node.querySelectorAll('a[target="_blank"]').forEach(function(a) {
                                a.target = '_self';
                            });
                        }
                    });
                });
            }).observe(document.body || document.documentElement, { childList: true, subtree: true });
        });
    "#)
    .build()
    .map_err(|e| format!("Failed to open login window: {}", e))?;

    let app_handle = app.clone();
    let platform_clone = platform.clone();
    let cookie_name = auth.cookie_name.to_string();
    let cookie_url_str = auth.cookie_url.to_string();
    let credential_key = auth.credential_key.to_string();

    // Listen for the window being closed by the user
    let app_for_close = app.clone();
    let platform_for_close = platform.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let _ = app_for_close.emit(
                "login_cancelled",
                serde_json::json!({ "platform": platform_for_close }),
            );
        }
    });

    // Spawn cookie polling task
    let window_label_poll = window_label.clone();
    tokio::spawn(async move {
        // Wait 2 seconds before first poll to let the page load
        // and capture the initial cookie value (if any from Edge)
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Capture initial cookie value — WebView2 shares cookies with Edge,
        // so there may already be a stale/expired cookie present.
        let initial_cookie_value: Option<String> = {
            let win: tauri::WebviewWindow = match app_handle.get_webview_window(&window_label_poll) {
                Some(w) => w,
                None => return,
            };
            let cookie_url: url::Url = match cookie_url_str.parse() {
                Ok(u) => u,
                Err(_) => None::<url::Url>.unwrap(), // won't happen
            };
            match win.cookies_for_url(cookie_url) {
                Ok(cookies) => {
                    cookies.iter()
                        .find(|c| c.name() == cookie_name)
                        .map(|c| c.value().to_string())
                }
                Err(_) => None,
            }
        };

        let max_polls = 590; // ~5 minutes remaining after initial 2s wait
        for _ in 0..max_polls {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

            // Check if window was closed by user
            let win: tauri::WebviewWindow = match app_handle.get_webview_window(&window_label_poll) {
                Some(w) => w,
                None => return,
            };

            let cookie_url: url::Url = match cookie_url_str.parse() {
                Ok(u) => u,
                Err(_) => continue,
            };

            match win.cookies_for_url(cookie_url) {
                Ok(cookies) => {
                    if let Some(session_cookie) = cookies.iter().find(|c| c.name() == cookie_name) {
                        let new_value = session_cookie.value().to_string();

                        // Only accept if the cookie value CHANGED from the initial snapshot.
                        // This prevents instant-close when a stale Edge cookie is present.
                        if Some(&new_value) == initial_cookie_value.as_ref() {
                            continue; // Same old cookie, keep waiting
                        }

                        // Fresh cookie! Store it.
                        if let Err(e) = store_credential(&credential_key, &new_value) {
                            eprintln!("Failed to store credential: {}", e);
                        }

                        let _ = app_handle.emit(
                            "platform_connected",
                            serde_json::json!({ "platform": platform_clone }),
                        );

                        let _ = win.close();
                        return;
                    }
                }
                Err(e) => {
                    eprintln!("Cookie poll error: {}", e);
                }
            }
        }

        // Timed out
        if let Some(win) = app_handle.get_webview_window(&window_label_poll) {
            let _ = win.close();
        }
        let _ = app_handle.emit(
            "login_timeout",
            serde_json::json!({ "platform": platform_clone }),
        );
    });

    Ok(())
}

/// Read a stored session cookie from Windows Credential Manager.
#[tauri::command]
pub fn get_session_cookie(platform: String) -> Result<String, String> {
    let auth = get_platform_auth(&platform)?;
    read_credential(auth.credential_key)
}

/// Delete a stored session cookie and clear cached data.
#[tauri::command]
pub async fn disconnect_platform(
    platform: String,
    db: tauri::State<'_, crate::commands::cache::DbState>,
) -> Result<(), String> {
    let auth = get_platform_auth(&platform)?;
    delete_credential(auth.credential_key)?;

    let conn = db
        .conn
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    crate::commands::cache::clear_cached(&conn, &platform)?;

    Ok(())
}
