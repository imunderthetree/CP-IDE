// features/complexity/ComplexityPanel.tsx — Empirical complexity analysis panel.
//
// Shows live runtime chart, curve fitting results, compiler info, and TLE warnings.
// Listens for Tauri 'complexity_point' events and cleans up on unmount.

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import ComplexityChart from "./ComplexityChart";
import InputStyleSelector from "./InputStyleSelector";
import TLEWarning from "./TLEWarning";
import { fitComplexity, getSafeN } from "../../lib/complexity_fit";
import type { FitResult } from "../../lib/complexity_fit";
import {
  detectCompilers,
  runComplexityAnalysis,
  stopComplexityAnalysis,
  type DetectedCompiler,
  type ComplexityDataPoint,
  type InputStyle,
} from "../../lib/tauriClient";

// ─── N-value chips ────────────────────────────────────────────────────────────

interface NChip {
  value: number;
  label: string;
  defaultOn: boolean;
}

const N_CHIPS: NChip[] = [
  { value: 100,    label: "100",  defaultOn: true },
  { value: 500,    label: "500",  defaultOn: false },
  { value: 1000,   label: "1k",   defaultOn: true },
  { value: 5000,   label: "5k",   defaultOn: false },
  { value: 10000,  label: "10k",  defaultOn: true },
  { value: 50000,  label: "50k",  defaultOn: false },
  { value: 100000, label: "100k", defaultOn: true },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComplexityPanelProps {
  code: string;
  language: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplexityPanel({ code, language }: ComplexityPanelProps) {
  // Compiler state
  const [compilers, setCompilers] = useState<DetectedCompiler[]>([]);
  const currentCompiler = compilers.find((c) => c.language === language);

  // Input configuration
  const [inputStyle, setInputStyle] = useState<InputStyle>("SingleInt");
  const [selectedNs, setSelectedNs] = useState<Set<number>>(
    () => new Set(N_CHIPS.filter((c) => c.defaultOn).map((c) => c.value))
  );

  // Analysis state
  const [points, setPoints] = useState<ComplexityDataPoint[]>([]);
  const [fit, setFit] = useState<FitResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for unlisten cleanup
  const unlistenRef = useRef<(() => void) | null>(null);

  // ─── Detect compilers on mount ───────────────────────────────────────────

  useEffect(() => {
    detectCompilers()
      .then(setCompilers)
      .catch((err) => console.error("Failed to detect compilers:", err));
  }, []);

  // ─── Listen for complexity_point events ──────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const unlisten = await listen<ComplexityDataPoint>("complexity_point", (event) => {
        if (!mounted) return;
        setPoints((prev) => {
          const next = [...prev, event.payload];
          if (next.length >= 4) {
            setFit(fitComplexity(next));
          }
          return next;
        });
      });
      unlistenRef.current = unlisten;
    };

    setup();

    return () => {
      mounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  // ─── Toggle n-value chip ─────────────────────────────────────────────────

  const toggleN = useCallback((n: number) => {
    setSelectedNs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  // ─── Run analysis ────────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setPoints([]);
    setFit(null);
    setError(null);

    const nValues = Array.from(selectedNs).sort((a, b) => a - b);

    try {
      await runComplexityAnalysis(
        code,
        language,
        nValues,
        inputStyle,
        currentCompiler?.path
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, code, language, selectedNs, inputStyle, currentCompiler]);

  // ─── Stop analysis ───────────────────────────────────────────────────────

  const handleStop = useCallback(async () => {
    try {
      await stopComplexityAnalysis();
    } catch (err) {
      console.error("Failed to stop:", err);
    }
    setIsRunning(false);
  }, []);

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setPoints([]);
    setFit(null);
    setError(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  const safeN = fit ? getSafeN(fit.best) : Infinity;

  return (
    <div className="cx-panel">
      {/* Header */}
      <div className="cx-header">
        <div className="cx-header-left">
          <h3 className="cx-title">Complexity Analysis</h3>
          {currentCompiler && (
            <span className="cx-compiler-badge">
              {currentCompiler.version.split(" ").slice(0, 2).join(" ")}
              <span className="cx-compiler-source">
                ({currentCompiler.source})
              </span>
            </span>
          )}
          {!currentCompiler && (
            <span className="cx-compiler-badge cx-compiler-missing">
              No compiler for {language}
            </span>
          )}
        </div>
        <div className="cx-header-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleReset}
            title="Reset"
            disabled={isRunning}
          >
            <RotateCcw size={12} />
          </button>
          {isRunning ? (
            <button className="btn btn-ghost btn-sm" onClick={handleStop} title="Stop">
              <Square size={12} /> Stop
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRun}
              title="Run analysis"
              disabled={!currentCompiler || selectedNs.size === 0}
            >
              <Play size={12} /> Run
            </button>
          )}
        </div>
      </div>

      {/* Input Configuration */}
      <div className="cx-config">
        <InputStyleSelector value={inputStyle} onChange={setInputStyle} />

        <div className="cx-nchips-section">
          <label className="cx-label">Test Sizes</label>
          <div className="cx-pill-row">
            {N_CHIPS.map((chip) => (
              <button
                key={chip.value}
                className={`filter-pill ${selectedNs.has(chip.value) ? "active" : ""}`}
                onClick={() => toggleN(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ComplexityChart points={points} isRunning={isRunning} />

      {/* Results */}
      {fit && (
        <div className="cx-results">
          <div className={`cx-fit-result ${fit.inconclusive ? "inconclusive" : ""}`}>
            <span className="cx-fit-class">{fit.best}</span>
            <span className="cx-fit-r2">
              R² = {fit.r2.toFixed(3)}
            </span>
          </div>
          {fit.inconclusive && (
            <div className="cx-inconclusive">
              Growth pattern unclear — try larger n values or more data points
            </div>
          )}
        </div>
      )}

      {/* TLE Warning */}
      {fit && !fit.inconclusive && (
        <TLEWarning complexity={fit.best} safeN={safeN} />
      )}

      {/* Error */}
      {error && (
        <div className="cx-error">
          {error}
        </div>
      )}
    </div>
  );
}
