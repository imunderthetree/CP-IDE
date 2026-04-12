// commands/extensions.rs — Plugin Loader for CP-IDE.
//
// Handles exposing the dedicated extensions directory and loading
// custom JavaScript extensions into the frontend.

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct ExtensionConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub is_loaded: bool,
}

/// Get the path to the dedicated extensions directory, creating it if necessary.
fn get_extensions_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?
        .join("extensions");

    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create extensions dir: {}", e))?;
    }

    Ok(dir)
}

/// Returns the full absolute path of the extensions directory.
#[tauri::command]
pub fn get_extensions_dir_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = get_extensions_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

/// Scans the extensions directory for all .js files and returns basic metadata.
#[tauri::command]
pub fn get_installed_extensions(app: tauri::AppHandle) -> Result<Vec<ExtensionConfig>, String> {
    let dir = get_extensions_dir(&app)?;
    let mut extensions = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read dir: {}", e))?;

    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("js") {
            let id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            // We can parse frontmatter or look for a matching .json here in the future.
            // For now, construct a default config based on filename.
            extensions.push(ExtensionConfig {
                id: id.clone(),
                name: id.replace("_", " ").replace("-", " "),
                description: "Local JavaScript Extension".into(),
                author: "Local User".into(),
                is_loaded: true,
            });
        }
    }

    Ok(extensions)
}

/// Reads the contents of a specific extension .js file by its ID (filename without extension).
#[tauri::command]
pub fn read_extension_script(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let dir = get_extensions_dir(&app)?;
    let file_path = dir.join(format!("{}.js", id));
    
    // Security: ensure the resolved path is still inside the extensions directory.
    let canonical_file = file_path.canonicalize().map_err(|_| "Extension not found".to_string())?;
    let canonical_dir = dir.canonicalize().map_err(|_| "Directory error".to_string())?;
    
    if !canonical_file.starts_with(canonical_dir) {
        return Err("Access denied: path traversal detected".into());
    }

    fs::read_to_string(&canonical_file).map_err(|e| format!("Failed to read script: {}", e))
}
