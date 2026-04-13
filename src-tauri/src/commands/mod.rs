// commands/mod.rs — Module registration for all Tauri IPC commands.
// Each sub-module exposes #[tauri::command] functions that the frontend can invoke.

pub mod auth;
pub mod cache;
pub mod codeforces;
pub mod compiler;
pub mod compiler_detect;
pub mod complexity;
pub mod extensions;
pub mod hackerrank;
pub mod leetcode;
pub mod snippets;
