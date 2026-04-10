// lib/platformApi.ts — Unified platform profile type for all CP platforms.
//
// Every platform adapter (Codeforces, LeetCode, HackerRank) maps its
// API response into this common shape so the Dashboard can render any
// platform with the same components.

// ─── Core Types ───────────────────────────────────────────────────────────────

export type PlatformType = 'codeforces' | 'leetcode' | 'hackerrank';

export interface PlatformProfile {
  platform: PlatformType;
  username: string;
  rating: number | null;
  rank: string | null;
  peakRating: number | null;
  ratingHistory: { date: string; rating: number }[];
  solvedCount: number;
  solvedByDifficulty: { label: string; count: number }[];
  solvedByTag: { tag: string; count: number }[];
  solveCalendar: { date: string; count: number }[];
  recentSubmissions: {
    problemName: string;
    verdict: Verdict;
    language: string;
    timestamp: string;
  }[];
  badges: { name: string; icon?: string }[];
  lastFetched: string;
}

export type Verdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'OTHER';

// ─── Codeforces Tier Colors ───────────────────────────────────────────────────

export interface TierInfo {
  name: string;
  color: string;
  gradient: string;
}

const CF_TIERS: { min: number; tier: TierInfo }[] = [
  { min: 3000, tier: { name: 'Legendary Grandmaster', color: '#ff0000', gradient: 'linear-gradient(135deg, #ff0000, #cc0000)' } },
  { min: 2600, tier: { name: 'International Grandmaster', color: '#ff0000', gradient: 'linear-gradient(135deg, #ff3333, #cc0000)' } },
  { min: 2400, tier: { name: 'Grandmaster', color: '#ff0000', gradient: 'linear-gradient(135deg, #ff4444, #dd0000)' } },
  { min: 2300, tier: { name: 'International Master', color: '#ff8c00', gradient: 'linear-gradient(135deg, #ffaa00, #ff7700)' } },
  { min: 2100, tier: { name: 'Master', color: '#ff8c00', gradient: 'linear-gradient(135deg, #ffaa00, #ff7700)' } },
  { min: 1900, tier: { name: 'Candidate Master', color: '#aa00aa', gradient: 'linear-gradient(135deg, #cc44cc, #9900aa)' } },
  { min: 1600, tier: { name: 'Expert', color: '#0000ff', gradient: 'linear-gradient(135deg, #4444ff, #0000cc)' } },
  { min: 1400, tier: { name: 'Specialist', color: '#03a89e', gradient: 'linear-gradient(135deg, #00ccbb, #039e94)' } },
  { min: 1200, tier: { name: 'Pupil', color: '#008000', gradient: 'linear-gradient(135deg, #00aa44, #006600)' } },
  { min: 0,    tier: { name: 'Newbie', color: '#808080', gradient: 'linear-gradient(135deg, #999999, #666666)' } },
];

/** Get Codeforces tier info for a given rating. */
export function getCfTier(rating: number | null): TierInfo {
  if (rating === null) return CF_TIERS[CF_TIERS.length - 1].tier;
  for (const { min, tier } of CF_TIERS) {
    if (rating >= min) return tier;
  }
  return CF_TIERS[CF_TIERS.length - 1].tier;
}

// ─── Verdict Colors ───────────────────────────────────────────────────────────

const VERDICT_COLORS: Record<Verdict, string> = {
  AC: '#3fb950',
  WA: '#f85149',
  TLE: '#d29922',
  RE: '#bc8cff',
  OTHER: '#8b949e',
};

/** Get the display color for a submission verdict. */
export function getVerdictColor(verdict: Verdict): string {
  return VERDICT_COLORS[verdict] ?? VERDICT_COLORS.OTHER;
}

/** Get a human-readable verdict label. */
export function getVerdictLabel(verdict: Verdict): string {
  const labels: Record<Verdict, string> = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit',
    RE: 'Runtime Error',
    OTHER: 'Other',
  };
  return labels[verdict] ?? verdict;
}

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/** Format a "last fetched" timestamp as relative time (e.g., "5 min ago"). */
export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
