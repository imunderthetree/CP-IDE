// features/editor/CompileFlagToggle.tsx — Debug vs Judge mode toggle.
//
// Switches between debug flags (-g -fsanitize=address) for local testing
// and judge flags (-O2) to match competitive programming judge settings.

import { Shield, Bug } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompileMode = "debug" | "judge";

interface CompileFlagToggleProps {
  /** Current compile mode. */
  mode: CompileMode;
  /** Called when the user toggles the compile mode. */
  onModeChange: (mode: CompileMode) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompileFlagToggle({ mode, onModeChange }: CompileFlagToggleProps) {
  const isJudge = mode === "judge";

  const toggle = () => {
    onModeChange(isJudge ? "debug" : "judge");
  };

  return (
    <div
      className="flag-toggle no-drag"
      onClick={toggle}
      role="switch"
      aria-checked={isJudge}
      aria-label={`Compile mode: ${mode}`}
      title={isJudge ? "Judge mode: -O2 -std=c++17" : "Debug mode: -g -fsanitize=address -std=c++17"}
    >
      <div className={`flag-toggle-track ${isJudge ? "active" : ""}`}>
        <div className="flag-toggle-thumb" />
      </div>
      <div className="flag-label">
        {isJudge ? (
          <>
            <Shield size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
            <span className="mode active">JUDGE</span>
            <span style={{ color: "var(--text-disabled)", marginLeft: 4, fontSize: "10px" }}>-O2</span>
          </>
        ) : (
          <>
            <Bug size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
            <span className="mode active">DEBUG</span>
            <span style={{ color: "var(--text-disabled)", marginLeft: 4, fontSize: "10px" }}>-g -fsanitize</span>
          </>
        )}
      </div>
    </div>
  );
}
