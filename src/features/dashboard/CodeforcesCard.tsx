// features/dashboard/CodeforcesCard.tsx — Full Codeforces profile card.
//
// Displays rating, tier badge, sparkline, tag breakdown, heatmap,
// recent submissions, and badges in a unified card layout.

import { useState, useEffect, useCallback } from "react";
import type { PlatformProfile } from "../../lib/platformApi";
import { getCfTier, timeAgo } from "../../lib/platformApi";
import { fetchCodeforcesProfile, getCfHandle, setCfHandle } from "../../lib/tauriClient";
import RatingSparkline from "./RatingSparkline";
import TagBreakdownChart from "./TagBreakdownChart";
import SolveHeatmap from "./SolveHeatmap";
import RecentSubmissions from "./RecentSubmissions";
import BadgesShelf from "./BadgesShelf";

type CardState = "idle" | "loading" | "loaded" | "error";

export default function CodeforcesCard() {
  const [handle, setHandle] = useState("");
  const [inputHandle, setInputHandle] = useState("");
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [error, setError] = useState("");

  // Load saved handle on mount
  useEffect(() => {
    getCfHandle().then((saved) => {
      if (saved) {
        setHandle(saved);
        setInputHandle(saved);
      }
    }).catch(() => {});
  }, []);

  // Fetch profile when handle is set
  useEffect(() => {
    if (!handle) return;
    loadProfile(handle);
  }, [handle]);

  const loadProfile = useCallback(async (h: string) => {
    setState("loading");
    setError("");
    try {
      const p = await fetchCodeforcesProfile(h);
      setProfile(p);
      setState("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  const handleConnect = async () => {
    const trimmed = inputHandle.trim();
    if (!trimmed) return;
    await setCfHandle(trimmed).catch(() => {});
    setHandle(trimmed);
  };

  const handleRefresh = () => {
    if (handle) loadProfile(handle);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConnect();
  };

  const tier = profile ? getCfTier(profile.rating) : null;

  // ─── Idle / Setup State ────────────────────────────────────────────────
  if (!handle) {
    return (
      <div className="platform-card cf-card">
        <div className="card-header">
          <div className="card-platform-badge cf-badge">
            <span className="platform-icon">🏆</span>
            Codeforces
          </div>
        </div>
        <div className="cf-connect-form">
          <p className="cf-connect-prompt">Enter your Codeforces handle to get started</p>
          <div className="cf-input-row">
            <input
              type="text"
              className="cf-handle-input"
              placeholder="e.g. tourist"
              value={inputHandle}
              onChange={(e) => setInputHandle(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-primary" onClick={handleConnect}>
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="platform-card cf-card">
        <div className="card-header">
          <div className="card-platform-badge cf-badge">
            <span className="platform-icon">🏆</span>
            Codeforces
          </div>
        </div>
        <div className="cf-loading">
          <div className="spinner" />
          <span>Fetching profile for {handle}...</span>
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="platform-card cf-card">
        <div className="card-header">
          <div className="card-platform-badge cf-badge">
            <span className="platform-icon">🏆</span>
            Codeforces
          </div>
        </div>
        <div className="cf-error">
          <span className="cf-error-icon">⚠️</span>
          <span className="cf-error-msg">{error}</span>
          <div className="cf-error-actions">
            <button className="btn btn-ghost" onClick={handleRefresh}>
              Retry
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setHandle("");
                setInputHandle("");
                setCfHandle("").catch(() => {});
                setState("idle");
              }}
            >
              Change Handle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loaded State ──────────────────────────────────────────────────────
  if (!profile) return null;

  return (
    <div className="platform-card cf-card cf-card-loaded">
      {/* Card Header */}
      <div className="card-header">
        <div className="card-platform-badge cf-badge">
          <span className="platform-icon">🏆</span>
          Codeforces
        </div>
        <div className="card-header-right">
          <span className="cf-last-updated" title={profile.lastFetched}>
            Updated {timeAgo(profile.lastFetched)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="cf-profile-summary">
        <div className="cf-username-row">
          <span className="cf-username" style={{ color: tier?.color }}>
            {profile.username}
          </span>
          {tier && (
            <span
              className="cf-tier-badge"
              style={{ background: tier.gradient, color: "#fff" }}
            >
              {tier.name}
            </span>
          )}
        </div>

        <div className="cf-stats-row">
          <div className="cf-stat">
            <span className="cf-stat-value" style={{ color: tier?.color }}>
              {profile.rating ?? "—"}
            </span>
            <span className="cf-stat-label">Rating</span>
          </div>
          <div className="cf-stat">
            <span className="cf-stat-value">
              {profile.peakRating ?? "—"}
            </span>
            <span className="cf-stat-label">Peak</span>
          </div>
          <div className="cf-stat">
            <span className="cf-stat-value accent-text">
              {profile.solvedCount}
            </span>
            <span className="cf-stat-label">Solved</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <BadgesShelf badges={profile.badges} />

      {/* Rating Sparkline */}
      <div className="cf-section">
        <h4 className="cf-section-title">Rating History</h4>
        <RatingSparkline data={profile.ratingHistory} currentRating={profile.rating} />
      </div>

      {/* Solve Heatmap */}
      <div className="cf-section">
        <h4 className="cf-section-title">Solve Activity</h4>
        <SolveHeatmap data={profile.solveCalendar} />
      </div>

      {/* Tag Breakdown */}
      <div className="cf-section">
        <h4 className="cf-section-title">Problems by Tag</h4>
        <TagBreakdownChart data={profile.solvedByTag} />
      </div>

      {/* Recent Submissions */}
      <div className="cf-section">
        <h4 className="cf-section-title">Recent Submissions</h4>
        <RecentSubmissions submissions={profile.recentSubmissions} />
      </div>
    </div>
  );
}
