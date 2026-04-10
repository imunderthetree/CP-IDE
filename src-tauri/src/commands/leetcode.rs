// commands/leetcode.rs — LeetCode GraphQL integration.
//
// Fetches user profile, solved problems, contest rating, tag stats, and recent
// submissions via LeetCode's private GraphQL API using a session cookie.
// Results are cached in SQLite with 30-min TTL.

use crate::commands::cache::{self, DbState};
use crate::commands::codeforces::{
    Badge, CalendarDay, DifficultyBucket, PlatformProfile, RatingPoint, Submission, TagBucket,
};
use chrono::{TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const LEETCODE_GRAPHQL: &str = "https://leetcode.com/graphql";

// ─── GraphQL Request / Response Types ─────────────────────────────────────────

#[derive(Serialize)]
struct GqlRequest {
    query: String,
    variables: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct GqlResponse<T> {
    data: Option<T>,
    errors: Option<Vec<GqlError>>,
}

#[derive(Debug, Deserialize)]
struct GqlError {
    message: String,
}

// ─── LeetCode Data Shapes ─────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcUserProfile {
    username: Option<String>,
    ranking: Option<i64>,
    reputation: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcMatchedUser {
    username: String,
    profile: Option<LcUserProfile>,
    submit_stats: Option<LcSubmitStats>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcSubmitStats {
    ac_submission_num: Vec<LcDifficultyCount>,
}

#[derive(Debug, Deserialize)]
struct LcDifficultyCount {
    difficulty: String,
    count: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcProfileData {
    matched_user: Option<LcMatchedUser>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcContestRanking {
    attended_contests_count: Option<i64>,
    rating: Option<f64>,
    global_ranking: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcContestHistoryEntry {
    contest: LcContest,
    rating: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct LcContest {
    title: String,
    #[serde(rename = "startTime")]
    start_time: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcContestData {
    user_contest_ranking: Option<LcContestRanking>,
    user_contest_ranking_history: Option<Vec<LcContestHistoryEntry>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcRecentSubmission {
    title: String,
    status_display: Option<String>,
    lang: Option<String>,
    timestamp: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcRecentData {
    recent_ac_submission_list: Option<Vec<LcRecentSubmission>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcTagProblem {
    tag_name: String,
    problems_solved: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcTagData {
    matched_user: Option<LcTagUser>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcTagUser {
    tag_problems_counts: Option<LcTagCounts>,
}

#[derive(Debug, Deserialize)]
struct LcTagCounts {
    advanced: Option<Vec<LcTagProblem>>,
    intermediate: Option<Vec<LcTagProblem>>,
    fundamental: Option<Vec<LcTagProblem>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcCalendarData {
    matched_user: Option<LcCalendarUser>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcCalendarUser {
    submission_calendar: Option<String>,
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

async fn lc_graphql<T: serde::de::DeserializeOwned>(
    session: &str,
    query: &str,
    variables: serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::new();
    let body = GqlRequest {
        query: query.to_string(),
        variables,
    };

    let resp = client
        .post(LEETCODE_GRAPHQL)
        .header("Content-Type", "application/json")
        .header("Cookie", format!("LEETCODE_SESSION={}", session))
        .header("Referer", "https://leetcode.com")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("LeetCode request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read LeetCode response: {}", e))?;

    if !status.is_success() {
        return Err(format!("LeetCode API returned {}: {}", status, &text[..text.len().min(300)]));
    }

    let gql: GqlResponse<T> = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse LeetCode response: {} — {}", e, &text[..text.len().min(200)]))?;

    if let Some(errors) = gql.errors {
        if !errors.is_empty() {
            return Err(format!("LeetCode GraphQL error: {}", errors[0].message));
        }
    }

    gql.data.ok_or_else(|| "No data in LeetCode response".to_string())
}

// ─── GraphQL Queries ──────────────────────────────────────────────────────────

const PROFILE_QUERY: &str = r#"
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking reputation }
    submitStats {
      acSubmissionNum { difficulty count }
    }
  }
}
"#;

const CONTEST_QUERY: &str = r#"
query userContestRankingInfo($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
  }
  userContestRankingHistory(username: $username) {
    contest { title startTime }
    rating
  }
}
"#;

const RECENT_AC_QUERY: &str = r#"
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title
    statusDisplay
    lang
    timestamp
  }
}
"#;

const TAG_QUERY: &str = r#"
query skillStats($username: String!) {
  matchedUser(username: $username) {
    tagProblemsCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}
"#;

const CALENDAR_QUERY: &str = r#"
query userProfileCalendar($username: String!) {
  matchedUser(username: $username) {
    submissionCalendar
  }
}
"#;

// ─── Data Transformation ──────────────────────────────────────────────────────

fn lc_map_verdict(status: &str) -> String {
    match status {
        "Accepted" => "AC".to_string(),
        "Wrong Answer" => "WA".to_string(),
        "Time Limit Exceeded" => "TLE".to_string(),
        "Runtime Error" | "Memory Limit Exceeded" => "RE".to_string(),
        _ => "OTHER".to_string(),
    }
}

fn parse_lc_calendar(calendar_json: &str) -> Vec<CalendarDay> {
    let map: HashMap<String, i64> = serde_json::from_str(calendar_json).unwrap_or_default();

    // Cover last 365 days
    let now = Utc::now();
    let mut result = Vec::new();
    for i in (0..365).rev() {
        let day = now - chrono::Duration::days(i);
        let date = day.format("%Y-%m-%d").to_string();
        let ts = day.timestamp().to_string();
        let count = map.get(&ts).copied().unwrap_or(0) as usize;
        result.push(CalendarDay { date, count });
    }
    result
}

// ─── Username auto-detection ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcGlobalData {
    user_status: Option<LcUserStatus>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LcUserStatus {
    username: Option<String>,
    is_signed_in: Option<bool>,
}

const GLOBAL_QUERY: &str = r#"
query globalData {
  userStatus {
    username
    isSignedIn
  }
}
"#;

async fn detect_username(session: &str) -> Result<String, String> {
    let data: LcGlobalData = lc_graphql(session, GLOBAL_QUERY, serde_json::json!({})).await?;
    let status = data.user_status.ok_or("Could not detect LeetCode username")?;
    if status.is_signed_in != Some(true) {
        // Auto-clear stale credential so user sees Connect button on next load
        if let Ok(entry) = keyring::Entry::new("cp-ide", "cpide_leetcode_session") {
            let _ = entry.delete_credential();
        }
        return Err("SESSION_EXPIRED".to_string());
    }
    status.username.ok_or("No username in LeetCode session".to_string())
}

// ─── Main Tauri Command ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_leetcode_profile(
    db: tauri::State<'_, DbState>,
) -> Result<PlatformProfile, String> {
    // Read session cookie from Windows Credential Manager
    let session = {
        let entry = keyring::Entry::new("cp-ide", "cpide_leetcode_session")
            .map_err(|e| format!("Keyring error: {}", e))?;
        entry.get_password().map_err(|_| "NOT_CONNECTED".to_string())?
    };

    // Auto-detect username from session
    let username = detect_username(&session).await?;

    // Check cache (30-min TTL)
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
        if let Some(cached) = cache::get_cached(&conn, "leetcode", &username) {
            let profile: PlatformProfile = serde_json::from_str(&cached)
                .map_err(|e| format!("Failed to deserialize cached data: {}", e))?;
            return Ok(profile);
        }
    }

    let vars = serde_json::json!({ "username": username });
    let vars_recent = serde_json::json!({ "username": username, "limit": 10 });

    // Parallel fetches
    let (profile_res, contest_res, recent_res, tag_res, cal_res) = tokio::join!(
        lc_graphql::<LcProfileData>(&session, PROFILE_QUERY, vars.clone()),
        lc_graphql::<LcContestData>(&session, CONTEST_QUERY, vars.clone()),
        lc_graphql::<LcRecentData>(&session, RECENT_AC_QUERY, vars_recent),
        lc_graphql::<LcTagData>(&session, TAG_QUERY, vars.clone()),
        lc_graphql::<LcCalendarData>(&session, CALENDAR_QUERY, vars.clone()),
    );

    // Parse profile
    let profile_data = profile_res?;
    let matched = profile_data.matched_user.ok_or("User not found on LeetCode")?;
    let lc_profile = matched.profile.unwrap_or(LcUserProfile {
        username: Some(username.clone()),
        ranking: None,
        reputation: None,
    });

    // Difficulty breakdown
    let submit_stats = matched.submit_stats;
    let mut solved_by_difficulty = Vec::new();
    let mut total_solved: usize = 0;
    if let Some(stats) = submit_stats {
        for d in &stats.ac_submission_num {
            if d.difficulty != "All" {
                solved_by_difficulty.push(DifficultyBucket {
                    label: d.difficulty.clone(),
                    count: d.count as usize,
                });
                total_solved += d.count as usize;
            }
        }
    }

    // Contest rating
    let contest_data = contest_res.unwrap_or(LcContestData {
        user_contest_ranking: None,
        user_contest_ranking_history: None,
    });
    let contest_rating = contest_data
        .user_contest_ranking
        .as_ref()
        .and_then(|r| r.rating)
        .map(|r| r as i64);
    let global_rank = contest_data
        .user_contest_ranking
        .as_ref()
        .and_then(|r| r.global_ranking);

    let rating_history: Vec<RatingPoint> = contest_data
        .user_contest_ranking_history
        .unwrap_or_default()
        .iter()
        .filter(|e| e.rating.unwrap_or(0.0) > 0.0)
        .map(|e| {
            let ts = e.contest.start_time.as_deref()
                .and_then(|s| s.parse::<i64>().ok())
                .map(|t| Utc.timestamp_opt(t, 0).single()
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default())
                .unwrap_or_default();
            RatingPoint {
                date: ts,
                rating: e.rating.unwrap_or(0.0) as i64,
            }
        })
        .collect();

    let peak_rating = rating_history.iter().map(|r| r.rating).max();

    // Recent submissions
    let recent_data = recent_res.unwrap_or(LcRecentData {
        recent_ac_submission_list: None,
    });
    let recent_submissions: Vec<Submission> = recent_data
        .recent_ac_submission_list
        .unwrap_or_default()
        .iter()
        .map(|s| {
            let ts = s.timestamp.as_deref()
                .and_then(|t| t.parse::<i64>().ok())
                .map(|t| Utc.timestamp_opt(t, 0).single()
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default())
                .unwrap_or_default();
            Submission {
                problem_name: s.title.clone(),
                verdict: lc_map_verdict(s.status_display.as_deref().unwrap_or("")),
                language: s.lang.clone().unwrap_or_default(),
                timestamp: ts,
            }
        })
        .collect();

    // Tag breakdown
    let tag_data = tag_res.unwrap_or(LcTagData { matched_user: None });
    let mut tag_map: HashMap<String, usize> = HashMap::new();
    if let Some(user) = tag_data.matched_user {
        if let Some(counts) = user.tag_problems_counts {
            for list in [counts.advanced, counts.intermediate, counts.fundamental].iter().flatten() {
                for tp in list {
                    *tag_map.entry(tp.tag_name.clone()).or_insert(0) += tp.problems_solved as usize;
                }
            }
        }
    }
    let mut solved_by_tag: Vec<TagBucket> = tag_map
        .into_iter()
        .map(|(tag, count)| TagBucket { tag, count })
        .collect();
    solved_by_tag.sort_by(|a, b| b.count.cmp(&a.count));
    solved_by_tag.truncate(15);

    // Calendar
    let cal_data = cal_res.unwrap_or(LcCalendarData { matched_user: None });
    let solve_calendar = cal_data
        .matched_user
        .and_then(|u| u.submission_calendar)
        .map(|c| parse_lc_calendar(&c))
        .unwrap_or_default();

    // Rank badge
    let mut badges = Vec::new();
    if let Some(rank) = global_rank {
        badges.push(Badge {
            name: format!("Global #{}", rank),
            icon: Some("🌍".to_string()),
        });
    }
    if total_solved >= 500 {
        badges.push(Badge { name: "500+ Solved".to_string(), icon: Some("🔥".to_string()) });
    } else if total_solved >= 200 {
        badges.push(Badge { name: "200+ Solved".to_string(), icon: Some("⭐".to_string()) });
    } else if total_solved >= 50 {
        badges.push(Badge { name: "50+ Solved".to_string(), icon: Some("💪".to_string()) });
    }

    let rank_str = lc_profile.ranking.map(|r| format!("#{}", r));

    let now = Utc::now().to_rfc3339();
    let profile = PlatformProfile {
        platform: "leetcode".to_string(),
        username: matched.username,
        rating: contest_rating,
        rank: rank_str,
        peak_rating: peak_rating,
        rating_history,
        solved_count: total_solved,
        solved_by_difficulty,
        solved_by_tag,
        solve_calendar,
        recent_submissions,
        badges,
        last_fetched: now.clone(),
    };

    // Cache
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let json = serde_json::to_string(&profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))?;
        cache::set_cached(&conn, "leetcode", &username, &json, &now)?;
    }

    Ok(profile)
}

// Old settings commands removed — auth is now handled by auth.rs + keyring
