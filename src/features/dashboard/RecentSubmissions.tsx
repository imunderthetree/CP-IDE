// features/dashboard/RecentSubmissions.tsx — Last 10 submissions with verdict coloring.

import { getVerdictColor, getVerdictLabel } from "../../lib/platformApi";
import type { Verdict } from "../../lib/platformApi";

interface SubmissionEntry {
  problemName: string;
  verdict: Verdict;
  language: string;
  timestamp: string;
}

interface Props {
  submissions: SubmissionEntry[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / 3600000;

  if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 48) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function RecentSubmissions({ submissions }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="submissions-empty">
        <span>No recent submissions</span>
      </div>
    );
  }

  return (
    <div className="submissions-list">
      {submissions.map((sub, idx) => (
        <div key={idx} className="submission-row">
          <div
            className="submission-verdict"
            style={{ color: getVerdictColor(sub.verdict) }}
          >
            <span className="verdict-dot" style={{ background: getVerdictColor(sub.verdict) }} />
            {getVerdictLabel(sub.verdict)}
          </div>
          <div className="submission-problem">{sub.problemName}</div>
          <div className="submission-meta">
            <span className="submission-lang">{sub.language}</span>
            <span className="submission-time">{formatTime(sub.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
