// commands/snippets.rs — Tauri IPC commands for the snippet library.
//
// Handles CRUD for personal/community snippets stored in SQLite,
// fetching the community snippet index from GitHub, and downloading
// individual community snippets.

use crate::commands::cache::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub title: String,
    pub description: String,
    pub language: String,
    pub tags: Vec<String>,
    pub code: String,
    pub source: String,
    pub author: Option<String>,
    #[serde(rename = "insertMode")]
    pub insert_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetMeta {
    pub id: String,
    pub title: String,
    pub language: String,
    pub tags: Vec<String>,
    pub author: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CommunityIndex {
    snippets: Vec<SnippetMeta>,
}

// ─── Community Index URL ──────────────────────────────────────────────────────

const COMMUNITY_INDEX_URL: &str =
    "https://raw.githubusercontent.com/cpide-community/cpide-snippets/main/index.json";

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Get all snippets from the local SQLite database.
#[tauri::command]
pub async fn get_all_snippets(db: State<'_, DbState>) -> Result<Vec<Snippet>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, title, description, language, tags, code, source, author FROM snippets")
        .map_err(|e| format!("Query error: {}", e))?;

    let snippets = stmt
        .query_map([], |row| {
            let tags_json: String = row.get(4)?;
            let tags: Vec<String> =
                serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(Snippet {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                language: row.get(3)?,
                tags,
                code: row.get(5)?,
                source: row.get(6)?,
                author: row.get(7)?,
                insert_mode: "cursor".to_string(),
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row parse error: {}", e))?;

    Ok(snippets)
}

/// Save a personal snippet to the database.
#[tauri::command]
pub async fn save_personal_snippet(
    snippet: Snippet,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let tags_json = serde_json::to_string(&snippet.tags)
        .map_err(|e| format!("JSON serialize error: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT OR REPLACE INTO snippets (id, title, description, language, tags, code, source, author, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            snippet.id,
            snippet.title,
            snippet.description,
            snippet.language,
            tags_json,
            snippet.code,
            "personal",
            snippet.author,
            now,
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    Ok(())
}

/// Delete a snippet by ID (personal or community only — builtins can't be deleted).
#[tauri::command]
pub async fn delete_snippet(id: String, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])
        .map_err(|e| format!("Delete error: {}", e))?;

    Ok(())
}

/// Fetch the community snippet index from GitHub.
/// Returns lightweight metadata for each available community snippet.
#[tauri::command]
pub async fn fetch_community_index() -> Result<Vec<SnippetMeta>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(COMMUNITY_INDEX_URL)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}: Failed to fetch community index", response.status()));
    }

    let index: CommunityIndex = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(index.snippets)
}

/// Download a single community snippet by its path, save it to SQLite.
#[tauri::command]
pub async fn download_snippet(
    path: String,
    db: State<'_, DbState>,
) -> Result<Snippet, String> {
    let client = reqwest::Client::new();

    let url = format!(
        "https://raw.githubusercontent.com/cpide-community/cpide-snippets/main/{}",
        path
    );

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}: Failed to download snippet", response.status()));
    }

    let snippet: Snippet = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    // Save to local database
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let tags_json = serde_json::to_string(&snippet.tags)
        .map_err(|e| format!("JSON serialize error: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT OR REPLACE INTO snippets (id, title, description, language, tags, code, source, author, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            snippet.id,
            snippet.title,
            snippet.description,
            snippet.language,
            tags_json,
            snippet.code,
            "community",
            snippet.author,
            now,
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    Ok(snippet)
}
