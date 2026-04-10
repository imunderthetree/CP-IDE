// lib/tauriClient.ts — Typed wrappers around Tauri invoke() for IPC commands.
//
// Every Tauri command gets a typed function here so the frontend never uses
// raw invoke() strings. This is the single point of contact between the
// React UI and the Rust backend.

import { invoke } from "@tauri-apps/api/core";

// ─── Request / Response Types ─────────────────────────────────────────────────

/** Payload sent to the run_code Tauri command. */
export interface RunCodeRequest {
  /** Source code to compile and execute. */
  code: string;
  /** Language identifier: "cpp" | "python" | "java". */
  language: "cpp" | "python" | "java";
  /** Standard input to feed the program. */
  stdin: string;
  /** Compile flags mode: "debug" or "judge". */
  flags: "debug" | "judge";
}

/** Response from the run_code Tauri command. */
export interface RunCodeResponse {
  /** Program's standard output. */
  stdout: string;
  /** Program's standard error (includes compile errors). */
  stderr: string;
  /** Process exit code. 0 = success. */
  exit_code: number;
  /** Wall-clock execution time in milliseconds. */
  runtime_ms: number;
  /** Peak memory usage in kilobytes (best-effort). */
  memory_kb: number;
}

// ─── Typed Invoke Wrappers ────────────────────────────────────────────────────

/**
 * Compile and run code using the bundled or system compiler.
 */
export async function runCode(request: RunCodeRequest): Promise<RunCodeResponse> {
  return invoke<RunCodeResponse>("run_code", { request });
}

// ─── Batch Execution Commands ─────────────────────────────────────────────────

/** Payload sent to the run_batch Tauri command. */
export interface RunBatchRequest {
  code: string;
  language: "cpp" | "python" | "java";
  stdins: string[];
  flags: "debug" | "judge";
}

/** Response from the run_batch Tauri command. */
export interface RunBatchResponse {
  compile_error: string | null;
  results: RunCodeResponse[];
}

/**
 * Compile code once, then run it against multiple test case inputs.
 */
export async function runBatch(request: RunBatchRequest): Promise<RunBatchResponse> {
  return invoke<RunBatchResponse>("run_batch", { request });
}

// ─── Auth Commands (WebView login + Credential Manager) ───────────────────────

import type { PlatformProfile, PlatformType } from "./platformApi";

/**
 * Open a WebView popup to the platform's login page.
 * The Rust backend will poll for the session cookie, store it in
 * Windows Credential Manager, and emit 'platform_connected' when done.
 */
export async function openLoginWindow(platform: PlatformType): Promise<void> {
  return invoke<void>("open_login_window", { platform });
}

/**
 * Check if a platform has a stored session cookie.
 * Returns the cookie value if connected, throws if not.
 */
export async function getSessionCookie(platform: PlatformType): Promise<string> {
  return invoke<string>("get_session_cookie", { platform });
}

/**
 * Disconnect a platform — deletes cookie from Credential Manager
 * and clears cached profile data.
 */
export async function disconnectPlatform(platform: PlatformType): Promise<void> {
  return invoke<void>("disconnect_platform", { platform });
}

// ─── Codeforces Commands ──────────────────────────────────────────────────────

/**
 * Fetch a Codeforces user's full profile (rating, submissions, etc.).
 * Results are cached server-side in SQLite for 5 minutes.
 */
export async function fetchCodeforcesProfile(handle: string): Promise<PlatformProfile> {
  return invoke<PlatformProfile>("fetch_codeforces_profile", { handle });
}

/** Get the saved Codeforces handle from local settings. */
export async function getCfHandle(): Promise<string> {
  return invoke<string>("get_cf_handle");
}

/** Save a Codeforces handle to local settings for persistence. */
export async function setCfHandle(handle: string): Promise<void> {
  return invoke<void>("set_cf_handle", { handle });
}

// ─── LeetCode Commands ────────────────────────────────────────────────────────

/**
 * Fetch a LeetCode user's full profile via GraphQL.
 * Session cookie is read from Windows Credential Manager internally.
 * Username is auto-detected from the session.
 */
export async function fetchLeetCodeProfile(): Promise<PlatformProfile> {
  return invoke<PlatformProfile>("fetch_leetcode_profile");
}

// ─── HackerRank Commands ──────────────────────────────────────────────────────

/**
 * Fetch a HackerRank user's profile.
 * Session cookie is read from Windows Credential Manager internally.
 * Username is auto-detected from the session.
 */
export async function fetchHackerRankProfile(): Promise<PlatformProfile> {
  return invoke<PlatformProfile>("fetch_hackerrank_profile");
}
