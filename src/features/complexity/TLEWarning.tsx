// features/complexity/TLEWarning.tsx — TLE warning banner with optimization suggestions.

import { AlertTriangle } from "lucide-react";

interface TLEWarningProps {
  complexity: string;
  safeN: number;
}

const SUGGESTIONS: Record<string, string> = {
  "O(n^2)": "Consider sorting + two pointers, or a segment tree (O(n log n))",
  "O(n^3)": "Try DP optimization or divide and conquer (O(n² ) or better)",
  "O(2^n)": "Try bitmask DP or meet-in-the-middle (O(2^(n/2)))",
  "O(n!)": "Try backtracking with pruning or DP over subsets",
};

export default function TLEWarning({ complexity, safeN }: TLEWarningProps) {
  if (safeN === Infinity || safeN > 100000) return null;

  const suggestion = SUGGESTIONS[complexity];

  return (
    <div className="tle-warning">
      <div className="tle-warning-header">
        <AlertTriangle size={14} />
        <span>
          {complexity} will TLE for n &gt; {safeN.toLocaleString()} in a 2s time
          limit
        </span>
      </div>
      {suggestion && <div className="tle-warning-suggestion">💡 {suggestion}</div>}
    </div>
  );
}
