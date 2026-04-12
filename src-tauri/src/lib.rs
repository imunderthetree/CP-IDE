// lib.rs — Main library entry point for CP-IDE's Tauri backend.
//
// Registers all IPC command modules and plugins.
// Command modules live in src/commands/ and are organized by feature.

mod commands;

use commands::cache::{self, DbState};
use commands::complexity::ComplexityCancel;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize SQLite database
    let conn = cache::init_db().expect("Failed to initialize SQLite database");
    let db_state = DbState {
        conn: std::sync::Mutex::new(conn),
    };

    // Complexity analysis cancellation flag
    let cancel_state = ComplexityCancel {
        cancelled: Arc::new(AtomicBool::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .manage(cancel_state)
        .invoke_handler(tauri::generate_handler![
            // Compiler
            commands::compiler::run_code,
            commands::compiler::run_batch,
            // Auth (WebView login + credential storage)
            commands::auth::open_login_window,
            commands::auth::get_session_cookie,
            commands::auth::disconnect_platform,
            // Codeforces (public API, no auth needed)
            commands::codeforces::fetch_codeforces_profile,
            commands::codeforces::get_cf_handle,
            commands::codeforces::set_cf_handle,
            // LeetCode (session cookie from keyring)
            commands::leetcode::fetch_leetcode_profile,
            // HackerRank (session cookie from keyring)
            commands::hackerrank::fetch_hackerrank_profile,
            // Snippets (library CRUD + community)
            commands::snippets::get_all_snippets,
            commands::snippets::save_personal_snippet,
            commands::snippets::delete_snippet,
            commands::snippets::fetch_community_index,
            commands::snippets::download_snippet,
            // Compiler detection
            commands::compiler_detect::detect_compilers,
            // Complexity analysis (empirical runner)
            commands::complexity::run_complexity_analysis,
            commands::complexity::stop_complexity_analysis,
            // Extensions
            commands::extensions::get_extensions_dir_path,
            commands::extensions::get_installed_extensions,
            commands::extensions::read_extension_script,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
