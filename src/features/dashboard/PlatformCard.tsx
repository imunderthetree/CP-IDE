// features/dashboard/PlatformCard.tsx — Unified profile card for all CP platforms.
//
// Renders the same layout for Codeforces, LeetCode, and HackerRank,
// adapting accent colors and tier badges per platform.

import { RefreshCw, Unlink } from "lucide-react";
import type { PlatformProfile, PlatformType } from "../../lib/platformApi";
import { getCfTier, timeAgo } from "../../lib/platformApi";
import RatingSparkline from "./RatingSparkline";
import TagBreakdownChart from "./TagBreakdownChart";
import SolveHeatmap from "./SolveHeatmap";
import RecentSubmissions from "./RecentSubmissions";
import BadgesShelf from "./BadgesShelf";
import DifficultyBar from "./DifficultyBar";
import SkeletonCard from "./SkeletonCard";

// ─── Platform Config ──────────────────────────────────────────────────────────

interface PlatformConfig {
  name: string;
  icon: string;
  accentColor: string;
  connectLabel: string;
  tagline: string;
}

const PLATFORM_CONFIG: Record<PlatformType, PlatformConfig> = {
  codeforces: {
    name: "Codeforces",
    icon: "🏆",
    accentColor: "#3B8BD4",
    connectLabel: "Enter your Codeforces handle",
    tagline: "Track your Codeforces rating, contests, and problem archive",
  },
  leetcode: {
    name: "LeetCode",
    icon: "⚡",
    accentColor: "#EF9F27",
    connectLabel: "Paste your LeetCode session cookie",
    tagline: "Monitor your LeetCode streaks, difficulty progress, and contest rating",
  },
  hackerrank: {
    name: "HackerRank",
    icon: "💻",
    accentColor: "#1D9E75",
    connectLabel: "Enter your HackerRank username",
    tagline: "View your HackerRank badges, certifications, and skill scores",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

type CardState = "idle" | "loading" | "loaded" | "error";

interface Props {
  platform: PlatformType;
  profile: PlatformProfile | null;
  state: CardState;
  error: string;
  /** Render the connection form content */
  connectForm: React.ReactNode;
  onRefresh: () => void;
  onDisconnect: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlatformCard({
  platform,
  profile,
  state,
  error,
  connectForm,
  onRefresh,
  onDisconnect,
}: Props) {
  const config = PLATFORM_CONFIG[platform];
  const accent = config.accentColor;

  // ── Idle: show connect form ─────────────────────────────────────────────
  if (state === "idle") {
    return (
      <div className="platform-card" style={{ "--platform-accent": accent } as React.CSSProperties}>
        <div className="card-header">
          <div
            className="card-platform-badge"
            style={{ background: `${accent}22`, color: accent }}
          >
            <span className="platform-icon">{config.icon}</span>
            {config.name}
          </div>
        </div>
        <div className="card-connect-body">
          <div className="card-connect-icon" style={{ color: accent }}>
            {config.icon}
          </div>
          <p className="card-connect-tagline">{config.tagline}</p>
          {connectForm}
        </div>
      </div>
    );
  }

  // ── Loading: skeleton ───────────────────────────────────────────────────
  if (state === "loading") {
    return <SkeletonCard accentColor={accent} />;
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="platform-card" style={{ "--platform-accent": accent } as React.CSSProperties}>
        <div className="card-header">
          <div
            className="card-platform-badge"
            style={{ background: `${accent}22`, color: accent }}
          >
            <span className="platform-icon">{config.icon}</span>
            {config.name}
          </div>
        </div>
        <div className="card-error-body">
          <span className="card-error-icon">⚠️</span>
          <span className="card-error-msg">{error}</span>
          <div className="card-error-actions">
            <button className="btn btn-ghost" onClick={onRefresh}>
              Retry
            </button>
            <button className="btn btn-ghost" onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loaded ──────────────────────────────────────────────────────────────
  if (!profile) return null;

  // Platform-specific tier badge
  const tierBadge = platform === "codeforces" && profile.rating != null
    ? getCfTier(profile.rating)
    : null;

  const ratingColor = tierBadge ? tierBadge.color : accent;

  return (
    <div
      className="platform-card platform-card-loaded"
      style={{ "--platform-accent": accent } as React.CSSProperties}
    >
      {/* Card Header */}
      <div className="card-header">
        <div
          className="card-platform-badge"
          style={{ background: `${accent}22`, color: accent }}
        >
          <span className="platform-icon">{config.icon}</span>
          {config.name}
        </div>
        <div className="card-header-right">
          <span className="card-last-updated" title={profile.lastFetched}>
            {timeAgo(profile.lastFetched)}
          </span>
          <button
            className="btn btn-ghost btn-sm card-refresh-btn"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onDisconnect}
            title="Disconnect"
          >
            <Unlink size={12} />
          </button>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="card-profile-summary">
        <div className="card-username-row">
          <span className="card-username" style={{ color: ratingColor }}>
            {profile.username}
          </span>
          {tierBadge && (
            <span
              className="card-tier-badge"
              style={{ background: tierBadge.gradient, color: "#fff" }}
            >
              {tierBadge.name}
            </span>
          )}
          {!tierBadge && profile.rank && (
            <span
              className="card-tier-badge"
              style={{ background: `${accent}22`, color: accent }}
            >
              {profile.rank}
            </span>
          )}
        </div>

        <div className="card-stats-row">
          {profile.rating != null && (
            <div className="card-stat">
              <span className="card-stat-value" style={{ color: ratingColor }}>
                {profile.rating}
              </span>
              <span className="card-stat-label">Rating</span>
            </div>
          )}
          {profile.peakRating != null && (
            <div className="card-stat">
              <span className="card-stat-value">{profile.peakRating}</span>
              <span className="card-stat-label">Peak</span>
            </div>
          )}
          <div className="card-stat">
            <span className="card-stat-value" style={{ color: accent }}>
              {profile.solvedCount}
            </span>
            <span className="card-stat-label">Solved</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <BadgesShelf badges={profile.badges} />

      {/* Rating Sparkline */}
      {profile.ratingHistory.length > 0 && (
        <div className="card-section">
          <h4 className="card-section-title">Rating History</h4>
          <RatingSparkline data={profile.ratingHistory} currentRating={profile.rating} />
        </div>
      )}

      {/* Difficulty Breakdown */}
      {profile.solvedByDifficulty.length > 0 && (
        <div className="card-section">
          <h4 className="card-section-title">Difficulty</h4>
          <DifficultyBar data={profile.solvedByDifficulty} accentColor={accent} />
        </div>
      )}

      {/* Solve Heatmap */}
      {profile.solveCalendar.length > 0 && (
        <div className="card-section">
          <h4 className="card-section-title">Activity</h4>
          <SolveHeatmap data={profile.solveCalendar} />
        </div>
      )}

      {/* Tag Breakdown */}
      {profile.solvedByTag.length > 0 && (
        <div className="card-section">
          <h4 className="card-section-title">Topics</h4>
          <TagBreakdownChart data={profile.solvedByTag} />
        </div>
      )}

      {/* Recent Submissions */}
      {profile.recentSubmissions.length > 0 && (
        <div className="card-section">
          <h4 className="card-section-title">Recent</h4>
          <RecentSubmissions submissions={profile.recentSubmissions} />
        </div>
      )}
    </div>
  );
}
