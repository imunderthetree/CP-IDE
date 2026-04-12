// commands/cache.rs — SQLite cache layer for platform profile data.
//
// Stores fetched platform data locally so we don't hammer APIs on every
// dashboard open. Data older than CACHE_TTL_SECS is considered stale.

use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

/// Cache time-to-live: 5 minutes.
const CACHE_TTL_SECS: i64 = 300;

/// Thread-safe database handle managed by Tauri state.
pub struct DbState {
    pub conn: Mutex<Connection>,
}

/// Get the path to the SQLite database file.
/// Stored in the system's app data directory.
pub fn db_path() -> PathBuf {
    let mut path = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("cp-ide");
    std::fs::create_dir_all(&path).ok();
    path.push("cpide_cache.db");
    path
}

/// Initialize the SQLite database and create tables if they don't exist.
pub fn init_db() -> Result<Connection, String> {
    let path = db_path();
    let conn = Connection::open(&path)
        .map_err(|e| format!("Failed to open SQLite database at {:?}: {}", path, e))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS profiles (
            platform   TEXT NOT NULL,
            username   TEXT NOT NULL,
            data       TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            PRIMARY KEY (platform, username)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS snippets (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            language    TEXT NOT NULL,
            tags        TEXT NOT NULL DEFAULT '[]',
            code        TEXT NOT NULL,
            source      TEXT NOT NULL,
            author      TEXT,
            created_at  TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| format!("Failed to create tables: {}", e))?;

    Ok(conn)
}

/// Retrieve cached profile data if it exists and is not stale.
/// Returns `Some(json_string)` if fresh data is available.
pub fn get_cached(conn: &Connection, platform: &str, username: &str) -> Option<String> {
    let result: Result<(String, String), _> = conn.query_row(
        "SELECT data, fetched_at FROM profiles WHERE platform = ?1 AND username = ?2",
        params![platform, username],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    match result {
        Ok((data, fetched_at)) => {
            if is_fresh(&fetched_at) {
                Some(data)
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

/// Store profile data in the cache.
pub fn set_cached(
    conn: &Connection,
    platform: &str,
    username: &str,
    data: &str,
    fetched_at: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO profiles (platform, username, data, fetched_at) VALUES (?1, ?2, ?3, ?4)",
        params![platform, username, data, fetched_at],
    )
    .map_err(|e| format!("Failed to cache profile: {}", e))?;
    Ok(())
}

/// Check if a timestamp is within the cache TTL.
fn is_fresh(fetched_at: &str) -> bool {
    if let Ok(fetched) = chrono::DateTime::parse_from_rfc3339(fetched_at) {
        let age = chrono::Utc::now().signed_duration_since(fetched);
        age.num_seconds() < CACHE_TTL_SECS
    } else {
        false
    }
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

/// Get a setting value by key.
pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .ok()
}

/// Set a setting value.
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("Failed to save setting: {}", e))?;
    Ok(())
}

/// Clear all cached profile data for a given platform.
pub fn clear_cached(conn: &Connection, platform: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM profiles WHERE platform = ?1",
        params![platform],
    )
    .map_err(|e| format!("Failed to clear cache: {}", e))?;
    Ok(())
}

