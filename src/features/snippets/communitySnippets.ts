// features/snippets/communitySnippets.ts — Community snippet index caching layer.
//
// Caches the community index in memory for 1 hour.
// Shows an offline indicator when the fetch fails.

import { fetchCommunityIndex } from "../../lib/tauriClient";
import type { SnippetMeta } from "./types";

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedIndex: SnippetMeta[] | null = null;
let cachedAt = 0;
let isOffline = false;

/** Whether the last community fetch failed (offline badge). */
export function isCommunityOffline(): boolean {
  return isOffline;
}

/**
 * Get the community snippet index with 1-hour caching.
 * Returns cached data if fresh, otherwise fetches from GitHub.
 * On failure, returns stale cache if available, empty array otherwise.
 */
export async function getCommunityIndex(): Promise<SnippetMeta[]> {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedIndex && now - cachedAt < CACHE_TTL_MS) {
    isOffline = false;
    return cachedIndex;
  }

  try {
    const index = await fetchCommunityIndex();
    cachedIndex = index;
    cachedAt = now;
    isOffline = false;
    return index;
  } catch {
    isOffline = true;
    // Return stale cache if available
    return cachedIndex ?? [];
  }
}

/** Force-refresh the community index, ignoring cache. */
export async function refreshCommunityIndex(): Promise<SnippetMeta[]> {
  cachedIndex = null;
  cachedAt = 0;
  return getCommunityIndex();
}
