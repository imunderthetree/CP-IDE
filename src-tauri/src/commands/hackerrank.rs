// commands/hackerrank.rs — HackerRank private API integration.
//
// Fetches user profile, badges, and submission history using a session cookie
// captured via WebView login. The cookie is stored in Windows Credential Manager
// via the keyring crate. Results are cached in SQLite with 30-min TTL.

use crate::commands::cache::{self, DbState};
use crate::commands::codeforces::{Badge, CalendarDay, PlatformProfile, TagBucket};
use chrono::Utc;
use serde::Deserialize;
use std::collections::HashMap;

// ─── HackerRank API Response Types ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct HrAuthMe {
    model: Option<HrAuthModel>,
}

#[derive(Debug, Deserialize)]
struct HrAuthModel {
    username: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HrProfile {
    username: Option<String>,
    level: Option<i64>,
    scores_elo: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct HrProfileResponse {
    model: Option<HrProfile>,
}

#[derive(Debug, Deserialize)]
struct HrBadge {
    badge_name: Option<String>,
    stars: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HrBadgesResponse {
    models: Option<Vec<HrBadge>>,
}

#[derive(Debug, Deserialize)]
struct HrSubmissionHistories {
    #[serde(flatten)]
    tracks: HashMap<String, serde_json::Value>,
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

fn build_hr_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

async fn hr_fetch<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
    cookie: &str,
) -> Result<T, String> {
    let resp = client
        .get(url)
        .header("Accept", "application/json")
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Referer", "https://www.hackerrank.com/")
        .header("Cookie", format!("_hrank_session={}", cookie))
        .send()
        .await
        .map_err(|e| format!("HackerRank request failed: {}", e))?;

    let status = resp.status();
    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err("HackerRank session expired — please reconnect".to_string());
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read HackerRank response: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "HackerRank API returned {}: {}",
            status,
            &text[..text.len().min(300)]
        ));
    }

    serde_json::from_str(&text).map_err(|e| {
        format!(
            "Failed to parse HackerRank response: {} — {}",
            e,
            &text[..text.len().min(200)]
        )
    })
}

// ─── Data Transformation ──────────────────────────────────────────────────────

fn parse_hr_submission_calendar(tracks: &HashMap<String, serde_json::Value>) -> Vec<CalendarDay> {
    let mut day_counts: HashMap<String, usize> = HashMap::new();

    for (_track, value) in tracks {
        if let Some(map) = value.as_object() {
            for (ts_str, count_val) in map {
                if let (Ok(ts), Some(count)) = (ts_str.parse::<i64>(), count_val.as_i64()) {
                    let date = chrono::TimeZone::timestamp_opt(&Utc, ts, 0)
                        .single()
                        .map(|dt| dt.format("%Y-%m-%d").to_string())
                        .unwrap_or_default();
                    if !date.is_empty() {
                        *day_counts.entry(date).or_insert(0) += count as usize;
                    }
                }
            }
        }
    }

    let now = Utc::now();
    let mut result = Vec::new();
    for i in (0..365).rev() {
        let day = now - chrono::Duration::days(i);
        let date = day.format("%Y-%m-%d").to_string();
        let count = day_counts.get(&date).copied().unwrap_or(0);
        result.push(CalendarDay { date, count });
    }
    result
}

fn build_hr_tag_buckets(tracks: &HashMap<String, serde_json::Value>) -> Vec<TagBucket> {
    let mut tags: HashMap<String, usize> = HashMap::new();

    for (track, value) in tracks {
        if let Some(map) = value.as_object() {
            let total: usize = map
                .values()
                .filter_map(|v| v.as_i64())
                .map(|v| v as usize)
                .sum();
            if total > 0 {
                tags.insert(track.clone(), total);
            }
        }
    }

    let mut result: Vec<TagBucket> = tags
        .into_iter()
        .map(|(tag, count)| TagBucket { tag, count })
        .collect();
    result.sort_by(|a, b| b.count.cmp(&a.count));
    result.truncate(15);
    result
}

// ─── Main Tauri Command ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_hackerrank_profile(
    db: tauri::State<'_, DbState>,
) -> Result<PlatformProfile, String> {
    // Read session cookie from Windows Credential Manager
    let cookie = {
        let entry = keyring::Entry::new("cp-ide", "cpide_hackerrank_session")
            .map_err(|e| format!("Keyring error: {}", e))?;
        entry
            .get_password()
            .map_err(|_| "NOT_CONNECTED".to_string())?
    };

    let client = build_hr_client()?;

    // Auto-detect username from session
    let auth_me: HrAuthMe =
        hr_fetch(&client, "https://www.hackerrank.com/rest/auth/me", &cookie).await?;
    let username = auth_me.model.and_then(|m| m.username);
    let username = match username {
        Some(u) => u,
        None => {
            // Auto-clear stale credential
            if let Ok(entry) = keyring::Entry::new("cp-ide", "cpide_hackerrank_session") {
                let _ = entry.delete_credential();
            }
            return Err("SESSION_EXPIRED".to_string());
        }
    };

    // Check cache (30-min TTL)
    {
        let conn = db
            .conn
            .lock()
            .map_err(|e| format!("DB lock error: {}", e))?;
        if let Some(cached) = cache::get_cached(&conn, "hackerrank", &username) {
            let profile: PlatformProfile = serde_json::from_str(&cached)
                .map_err(|e| format!("Failed to deserialize cached data: {}", e))?;
            return Ok(profile);
        }
    }

    let profile_url = format!("https://www.hackerrank.com/rest/hackers/{}", username);
    let badges_url = format!(
        "https://www.hackerrank.com/rest/hackers/{}/badges",
        username
    );
    let calendar_url = format!(
        "https://www.hackerrank.com/rest/hackers/{}/submission_histories",
        username
    );

    // Parallel fetches (all with session cookie)
    let (profile_res, badges_res, calendar_res) = tokio::join!(
        hr_fetch::<HrProfileResponse>(&client, &profile_url, &cookie),
        hr_fetch::<HrBadgesResponse>(&client, &badges_url, &cookie),
        hr_fetch::<HrSubmissionHistories>(&client, &calendar_url, &cookie),
    );

    // Parse profile
    let hr_profile = profile_res?.model.ok_or("HackerRank user not found")?;

    let display_name = hr_profile.username.clone().unwrap_or(username.clone());

    // Parse badges
    let hr_badges = badges_res.unwrap_or(HrBadgesResponse { models: None });
    let badges: Vec<Badge> = hr_badges
        .models
        .unwrap_or_default()
        .iter()
        .filter_map(|b| {
            b.badge_name.as_ref().map(|name| {
                let star_str = b.stars.as_deref().unwrap_or("");
                let icon = if star_str.contains("gold") {
                    Some("🥇".to_string())
                } else if star_str.contains("silver") {
                    Some("🥈".to_string())
                } else if star_str.contains("bronze") {
                    Some("🥉".to_string())
                } else {
                    Some("⭐".to_string())
                };
                Badge {
                    name: name.clone(),
                    icon,
                }
            })
        })
        .collect();

    // Parse submission calendar
    let calendar_data = calendar_res.unwrap_or(HrSubmissionHistories {
        tracks: HashMap::new(),
    });
    let solve_calendar = parse_hr_submission_calendar(&calendar_data.tracks);
    let solved_by_tag = build_hr_tag_buckets(&calendar_data.tracks);

    let total_solved: usize = solve_calendar.iter().map(|d| d.count).sum();

    let rating = hr_profile.scores_elo;
    let level = hr_profile.level.map(|l| format!("Level {}", l));

    let now = Utc::now().to_rfc3339();

    let profile = PlatformProfile {
        platform: "hackerrank".to_string(),
        username: display_name,
        rating,
        rank: level,
        peak_rating: rating,
        rating_history: Vec::new(),
        solved_count: total_solved,
        solved_by_difficulty: Vec::new(),
        solved_by_tag,
        solve_calendar,
        recent_submissions: Vec::new(),
        badges,
        last_fetched: now.clone(),
    };

    // Cache
    {
        let conn = db
            .conn
            .lock()
            .map_err(|e| format!("DB lock error: {}", e))?;
        let json = serde_json::to_string(&profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))?;
        cache::set_cached(&conn, "hackerrank", &username, &json, &now)?;
    }

    Ok(profile)
}

// Old settings commands removed — auth is now handled by auth.rs + keyring
