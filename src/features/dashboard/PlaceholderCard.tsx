// features/dashboard/PlaceholderCard.tsx — "Connect" CTA for LeetCode / HackerRank.

import type { PlatformType } from "../../lib/platformApi";

interface Props {
  platform: PlatformType;
}

const PLATFORM_INFO: Record<string, { name: string; color: string; icon: string; tagline: string }> = {
  leetcode: {
    name: "LeetCode",
    color: "#ffa116",
    icon: "⚡",
    tagline: "Track your LeetCode progress, streaks, and problem-solving patterns",
  },
  hackerrank: {
    name: "HackerRank",
    color: "#1ba94c",
    icon: "💻",
    tagline: "View your HackerRank certifications, badges, and skill scores",
  },
};

export default function PlaceholderCard({ platform }: Props) {
  const info = PLATFORM_INFO[platform];
  if (!info) return null;

  return (
    <div className="platform-card placeholder-card">
      <div className="card-header">
        <div className="card-platform-badge" style={{ background: `${info.color}22`, color: info.color }}>
          <span className="platform-icon">{info.icon}</span>
          {info.name}
        </div>
      </div>

      <div className="placeholder-body">
        <div className="placeholder-icon" style={{ color: info.color }}>
          {info.icon}
        </div>
        <p className="placeholder-tagline">{info.tagline}</p>
        <button
          className="btn placeholder-connect-btn"
          style={{
            background: `${info.color}18`,
            color: info.color,
            border: `1px solid ${info.color}33`,
          }}
          onClick={() => {/* TODO: v0.3 */}}
        >
          Connect {info.name}
        </button>
        <span className="placeholder-coming">Coming in v0.3</span>
      </div>
    </div>
  );
}
