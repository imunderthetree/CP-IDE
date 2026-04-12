// commands/compiler_detect.rs — Compiler detection for CP-IDE.
//
// Priority: Bundled compiler > System compiler on PATH > Not available.
// Returns version strings and paths for all detected compilers.

use serde::Serialize;
use std::path::Path;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DetectedCompiler {
    pub language: String,
    pub source: String, // "bundled" or "system"
    pub path: String,
    pub version: String,
    pub is_bundled: bool,
}

// ─── Command ──────────────────────────────────────────────────────────────────

/// Detect available compilers (bundled first, then system PATH).
#[tauri::command]
pub fn detect_compilers(app: tauri::AppHandle) -> Vec<DetectedCompiler> {
    use tauri::Manager;

    let mut found: Vec<DetectedCompiler> = Vec::new();

    // Get the resource directory from the app handle
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_default();

    // Check bundled compilers first
    let bundled_paths: Vec<(&str, std::path::PathBuf)> = vec![
        ("cpp", resource_dir.join("compilers/mingw/bin/g++.exe")),
        ("python", resource_dir.join("compilers/python/python.exe")),
        ("java", resource_dir.join("compilers/jdk/bin/javac.exe")),
    ];

    for (lang, path) in &bundled_paths {
        if path.exists() {
            let version = get_compiler_version(path, lang);
            found.push(DetectedCompiler {
                language: lang.to_string(),
                source: "bundled".into(),
                path: path.to_string_lossy().into(),
                version,
                is_bundled: true,
            });
        }
    }

    // Check system PATH only for languages not covered by bundled
    let covered: Vec<String> = found.iter().map(|c| c.language.clone()).collect();

    let system_candidates: Vec<(&str, Vec<&str>)> = vec![
        ("cpp", vec!["g++", "clang++"]),
        ("python", vec!["python3", "python", "py", "pypy3"]),
        ("java", vec!["javac"]),
    ];

    for (lang, candidates) in &system_candidates {
        if covered.contains(&lang.to_string()) {
            continue;
        }
        for &cmd in candidates {
            if let Ok(out) = std::process::Command::new(cmd)
                .arg("--version")
                .output()
            {
                if out.status.success() || !out.stderr.is_empty() {
                    // javac --version writes to stdout on newer JDKs,
                    // but older versions write to stderr
                    let output_str = if out.stdout.is_empty() {
                        String::from_utf8_lossy(&out.stderr).to_string()
                    } else {
                        String::from_utf8_lossy(&out.stdout).to_string()
                    };
                    let version = output_str
                        .lines()
                        .next()
                        .unwrap_or("unknown")
                        .to_string();

                    found.push(DetectedCompiler {
                        language: lang.to_string(),
                        source: "system".into(),
                        path: cmd.into(),
                        version,
                        is_bundled: false,
                    });
                    break;
                }
            }
        }
    }

    found
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Get the version string from a compiler binary.
/// Note: javac uses `-version` and may write to stderr.
fn get_compiler_version(path: &Path, lang: &str) -> String {
    let arg = if lang == "java" { "-version" } else { "--version" };
    std::process::Command::new(path)
        .arg(arg)
        .output()
        .map(|o| {
            // javac writes to stderr on some platforms, others to stdout
            let out = if o.stdout.is_empty() {
                o.stderr
            } else {
                o.stdout
            };
            String::from_utf8_lossy(&out)
                .lines()
                .next()
                .unwrap_or("unknown")
                .to_string()
        })
        .unwrap_or_else(|_| "unknown".into())
}
