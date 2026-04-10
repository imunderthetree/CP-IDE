// commands/codeforces.rs — Codeforces API integration.
//
// Fetches user info, rating history, and recent submissions from the
// public Codeforces API and transforms them into a unified PlatformProfile.
// Results are cached in SQLite to avoid excessive API calls.

use crate::commands::cache::{self, DbState};
use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

// ─── Codeforces API Response Types ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct CfApiResponse<T> {
    status: String,
    result: Option<T>,
    comment: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CfUser {
    handle: String,
    rating: Option<i64>,
    max_rating: Option<i64>,
    rank: Option<String>,
    max_rank: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CfRatingChange {
    rating_update_time_seconds: i64,
    new_rating: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CfSubmission {
    id: u64,
    creation_time_seconds: i64,
    problem: CfProblem,
    verdict: Option<String>,
    programming_language: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CfProblem {
    name: String,
    rating: Option<i64>,
    tags: Vec<String>,
}

// ─── PlatformProfile (mirrors the frontend type) ─────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlatformProfile {
    pub platform: String,
    pub username: String,
    pub rating: Option<i64>,
    pub rank: Option<String>,
    pub peak_rating: Option<i64>,
    pub rating_history: Vec<RatingPoint>,
    pub solved_count: usize,
    pub solved_by_difficulty: Vec<DifficultyBucket>,
    pub solved_by_tag: Vec<TagBucket>,
    pub solve_calendar: Vec<CalendarDay>,
    pub recent_submissions: Vec<Submission>,
    pub badges: Vec<Badge>,
    pub last_fetched: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RatingPoint {
    pub date: String,
    pub rating: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DifficultyBucket {
    pub label: String,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagBucket {
    pub tag: String,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarDay {
    pub date: String,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Submission {
    pub problem_name: String,
    pub verdict: String,
    pub language: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Badge {
    pub name: String,
    pub icon: Option<String>,
}

// ─── HTTP Fetch Helpers ───────────────────────────────────────────────────────

async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Result<T, String> {
    let resp = reqwest::get(url)
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        return Err(format!("API returned status {}: {}", status, body));
    }

    serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse JSON: {} — body: {}", e, &body[..body.len().min(200)]))
}

// ─── Data Transformation ──────────────────────────────────────────────────────

fn map_verdict(cf_verdict: &str) -> String {
    match cf_verdict {
        "OK" => "AC".to_string(),
        "WRONG_ANSWER" => "WA".to_string(),
        "TIME_LIMIT_EXCEEDED" => "TLE".to_string(),
        "RUNTIME_ERROR" | "MEMORY_LIMIT_EXCEEDED" => "RE".to_string(),
        _ => "OTHER".to_string(),
    }
}

fn timestamp_to_iso(secs: i64) -> String {
    Utc.timestamp_opt(secs, 0)
        .single()
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default()
}

fn timestamp_to_date(secs: i64) -> String {
    Utc.timestamp_opt(secs, 0)
        .single()
        .map(|dt: DateTime<Utc>| dt.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

fn build_difficulty_buckets(problems: &[(Option<i64>, &[String])]) -> Vec<DifficultyBucket> {
    let mut buckets: HashMap<String, usize> = HashMap::new();

    for (rating, _) in problems {
        let label = match rating {
            Some(r) if *r < 1200 => "< 1200",
            Some(r) if *r < 1600 => "1200-1599",
            Some(r) if *r < 2000 => "1600-1999",
            Some(r) if *r < 2400 => "2000-2399",
            Some(r) if *r >= 2400 => "2400+",
            _ => "Unrated",
        };
        *buckets.entry(label.to_string()).or_insert(0) += 1;
    }

    let order = ["< 1200", "1200-1599", "1600-1999", "2000-2399", "2400+", "Unrated"];
    order
        .iter()
        .filter_map(|label| {
            buckets.get(*label).map(|count| DifficultyBucket {
                label: label.to_string(),
                count: *count,
            })
        })
        .collect()
}

fn build_tag_buckets(problems: &[(Option<i64>, &[String])]) -> Vec<TagBucket> {
    let mut tags: HashMap<String, usize> = HashMap::new();
    for (_, problem_tags) in problems {
        for tag in *problem_tags {
            *tags.entry(tag.clone()).or_insert(0) += 1;
        }
    }
    let mut result: Vec<TagBucket> = tags
        .into_iter()
        .map(|(tag, count)| TagBucket { tag, count })
        .collect();
    result.sort_by(|a, b| b.count.cmp(&a.count));
    result.truncate(15); // Top 15 tags
    result
}

fn build_solve_calendar(submissions: &[CfSubmission]) -> Vec<CalendarDay> {
    let mut days: HashMap<String, usize> = HashMap::new();
    let mut seen: HashSet<String> = HashSet::new();

    for sub in submissions {
        let verdict = sub.verdict.as_deref().unwrap_or("");
        if verdict == "OK" {
            let key = format!("{}-{}", sub.problem.name, sub.creation_time_seconds / 86400);
            if seen.insert(key) {
                let date = timestamp_to_date(sub.creation_time_seconds);
                *days.entry(date).or_insert(0) += 1;
            }
        }
    }

    // Cover the last 365 days
    let now = Utc::now();
    let mut result = Vec::new();
    for i in (0..365).rev() {
        let day = now - chrono::Duration::days(i);
        let date = day.format("%Y-%m-%d").to_string();
        let count = days.get(&date).copied().unwrap_or(0);
        result.push(CalendarDay { date, count });
    }
    result
}

fn derive_badges(user: &CfUser, solved_count: usize) -> Vec<Badge> {
    let mut badges = Vec::new();

    // Rank badge
    if let Some(ref rank) = user.max_rank {
        badges.push(Badge {
            name: format!("Peak: {}", rank),
            icon: Some("🏆".to_string()),
        });
    }

    // Milestone badges
    if solved_count >= 1000 {
        badges.push(Badge { name: "1000+ Solved".to_string(), icon: Some("🔥".to_string()) });
    } else if solved_count >= 500 {
        badges.push(Badge { name: "500+ Solved".to_string(), icon: Some("⭐".to_string()) });
    } else if solved_count >= 100 {
        badges.push(Badge { name: "100+ Solved".to_string(), icon: Some("💪".to_string()) });
    }

    if let Some(rating) = user.max_rating {
        if rating >= 2400 {
            badges.push(Badge { name: "Grandmaster".to_string(), icon: Some("👑".to_string()) });
        } else if rating >= 1900 {
            badges.push(Badge { name: "CM+".to_string(), icon: Some("🎯".to_string()) });
        }
    }

    badges
}

// ─── Main Tauri Command ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_codeforces_profile(
    handle: String,
    db: tauri::State<'_, DbState>,
) -> Result<PlatformProfile, String> {
    let handle = handle.trim().to_string();
    if handle.is_empty() {
        return Err("Handle cannot be empty".to_string());
    }

    // Check cache first
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
        if let Some(cached) = cache::get_cached(&conn, "codeforces", &handle) {
            let profile: PlatformProfile = serde_json::from_str(&cached)
                .map_err(|e| format!("Failed to deserialize cached data: {}", e))?;
            return Ok(profile);
        }
    }

    // Fetch from Codeforces API (3 parallel requests)
    let info_url = format!("https://codeforces.com/api/user.info?handles={}", handle);
    let rating_url = format!("https://codeforces.com/api/user.rating?handle={}", handle);
    let status_url = format!(
        "https://codeforces.com/api/user.status?handle={}&from=1&count=1000",
        handle
    );

    let (info_res, rating_res, status_res) = tokio::join!(
        fetch_json::<CfApiResponse<Vec<CfUser>>>(&info_url),
        fetch_json::<CfApiResponse<Vec<CfRatingChange>>>(&rating_url),
        fetch_json::<CfApiResponse<Vec<CfSubmission>>>(&status_url),
    );

    // Parse user info
    let info_resp = info_res?;
    if info_resp.status != "OK" {
        return Err(info_resp.comment.unwrap_or_else(|| "Failed to fetch user info".to_string()));
    }
    let users = info_resp.result.ok_or("No user data returned")?;
    let user = users.into_iter().next().ok_or("User not found")?;

    // Parse rating history
    let rating_resp = rating_res?;
    let rating_changes = if rating_resp.status == "OK" {
        rating_resp.result.unwrap_or_default()
    } else {
        Vec::new()
    };

    let rating_history: Vec<RatingPoint> = rating_changes
        .iter()
        .map(|rc| RatingPoint {
            date: timestamp_to_iso(rc.rating_update_time_seconds),
            rating: rc.new_rating,
        })
        .collect();

    // Parse submissions
    let status_resp = status_res?;
    let submissions = if status_resp.status == "OK" {
        status_resp.result.unwrap_or_default()
    } else {
        Vec::new()
    };

    // Compute solved problems (unique accepted problems)
    let mut solved_problems: HashMap<String, (Option<i64>, Vec<String>)> = HashMap::new();
    for sub in &submissions {
        let verdict = sub.verdict.as_deref().unwrap_or("");
        if verdict == "OK" {
            solved_problems
                .entry(sub.problem.name.clone())
                .or_insert_with(|| (sub.problem.rating, sub.problem.tags.clone()));
        }
    }

    let solved_count = solved_problems.len();
    let problems_for_stats: Vec<(Option<i64>, &[String])> = solved_problems
        .values()
        .map(|(r, t)| (*r, t.as_slice()))
        .collect();

    let solved_by_difficulty = build_difficulty_buckets(&problems_for_stats);
    let solved_by_tag = build_tag_buckets(&problems_for_stats);
    let solve_calendar = build_solve_calendar(&submissions);

    // Recent 10 submissions
    let recent_submissions: Vec<Submission> = submissions
        .iter()
        .take(10)
        .map(|sub| Submission {
            problem_name: sub.problem.name.clone(),
            verdict: map_verdict(sub.verdict.as_deref().unwrap_or("OTHER")),
            language: sub.programming_language.clone(),
            timestamp: timestamp_to_iso(sub.creation_time_seconds),
        })
        .collect();

    let badges = derive_badges(&user, solved_count);

    let now = Utc::now().to_rfc3339();

    let profile = PlatformProfile {
        platform: "codeforces".to_string(),
        username: user.handle,
        rating: user.rating,
        rank: user.rank,
        peak_rating: user.max_rating,
        rating_history,
        solved_count,
        solved_by_difficulty,
        solved_by_tag,
        solve_calendar,
        recent_submissions,
        badges,
        last_fetched: now.clone(),
    };

    // Cache the result
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let json = serde_json::to_string(&profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))?;
        cache::set_cached(&conn, "codeforces", &handle, &json, &now)?;
        // Also save the handle as a setting for persistence
        cache::set_setting(&conn, "codeforces_handle", &handle)?;
    }

    Ok(profile)
}

/// Get the saved Codeforces handle from settings.
#[tauri::command]
pub async fn get_cf_handle(db: tauri::State<'_, DbState>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    Ok(cache::get_setting(&conn, "codeforces_handle").unwrap_or_default())
}

/// Save the Codeforces handle to settings.
#[tauri::command]
pub async fn set_cf_handle(handle: String, db: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    cache::set_setting(&conn, "codeforces_handle", &handle)
}
