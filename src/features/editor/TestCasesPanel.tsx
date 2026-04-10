// features/editor/TestCasesPanel.tsx — Test case management panel with run-all.
//
// Shows a sidebar list of test cases with pass/fail dots, three-column
// editor for input/expected/actual, diff viewer for failed cases, and
// run-all functionality with sequential execution.

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import DiffViewer from "./DiffViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestCase {
  id: string;
  label: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  verdict: "pending" | "running" | "pass" | "fail" | "error";
  runtimeMs: number | null;
  memoryKb: number | null;
  stderr: string | null;
}

export interface TestRunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  runtime_ms: number;
  memory_kb: number;
}

/** Result from a batch run (compile once, run N times). */
export interface BatchRunResult {
  compile_error: string | null;
  results: TestRunResult[];
}

interface Props {
  testCases: TestCase[];
  onTestCasesChange: (cases: TestCase[]) => void;
  onRunSingle: (testCase: TestCase) => Promise<TestRunResult>;
  /** Batch runner: compile once, run all stdins. */
  onRunBatch: (stdins: string[]) => Promise<BatchRunResult>;
  isRunning: boolean;
  onRunningChange: (running: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;
export function createTestCase(input = "", expected = ""): TestCase {
  const id = `tc-${Date.now()}-${nextId++}`;
  return {
    id,
    label: `TC${nextId - 1}`,
    input,
    expectedOutput: expected,
    actualOutput: null,
    verdict: "pending",
    runtimeMs: null,
    memoryKb: null,
    stderr: null,
  };
}

function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").trimEnd();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestCasesPanel({
  testCases,
  onTestCasesChange,
  onRunSingle,
  onRunBatch,
  isRunning,
  onRunningChange,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    testCases.length > 0 ? testCases[0].id : null
  );
  const [showDiff, setShowDiff] = useState<string | null>(null);

  const selected = testCases.find((tc) => tc.id === selectedId) ?? null;

  // ─── Add / Remove ──────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    const tc = createTestCase();
    onTestCasesChange([...testCases, tc]);
    setSelectedId(tc.id);
  }, [testCases, onTestCasesChange]);

  const handleRemove = useCallback(
    (id: string) => {
      const filtered = testCases.filter((tc) => tc.id !== id);
      onTestCasesChange(filtered);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      if (showDiff === id) setShowDiff(null);
    },
    [testCases, selectedId, showDiff, onTestCasesChange]
  );

  // ─── Update Fields ─────────────────────────────────────────────────────
  const updateCase = useCallback(
    (id: string, updates: Partial<TestCase>) => {
      onTestCasesChange(
        testCases.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc))
      );
    },
    [testCases, onTestCasesChange]
  );

  // ─── Run Single ────────────────────────────────────────────────────────
  const handleRunSingle = useCallback(
    async (tc: TestCase) => {
      updateCase(tc.id, { verdict: "running", actualOutput: null, stderr: null });
      try {
        const result = await onRunSingle(tc);
        const actual = result.stdout;
        const expected = tc.expectedOutput;
        const pass =
          expected.trim() === ""
            ? true  // No expected output → always "pass" (just show output)
            : normalizeOutput(actual) === normalizeOutput(expected);

        updateCase(tc.id, {
          actualOutput: actual,
          stderr: result.stderr || null,
          verdict: result.exit_code !== 0 ? "error" : pass ? "pass" : "fail",
          runtimeMs: result.runtime_ms,
          memoryKb: result.memory_kb,
        });
      } catch (err) {
        updateCase(tc.id, {
          verdict: "error",
          actualOutput: null,
          stderr: err instanceof Error ? err.message : String(err),
          runtimeMs: null,
          memoryKb: null,
        });
      }
    },
    [onRunSingle, updateCase]
  );

  // ─── Run All (batch: compile once, run N times) ────────────────────────
  const handleRunAll = useCallback(async () => {
    if (isRunning || testCases.length === 0) return;
    onRunningChange(true);

    // Mark all as running
    onTestCasesChange(
      testCases.map((tc) => ({
        ...tc,
        verdict: "running" as const,
        actualOutput: null,
        stderr: null,
        runtimeMs: null,
        memoryKb: null,
      }))
    );

    try {
      const stdins = testCases.map((tc) => tc.input);
      const batch = await onRunBatch(stdins);

      if (batch.compile_error) {
        // Compilation failed — mark all as error
        onTestCasesChange(
          testCases.map((tc) => ({
            ...tc,
            verdict: "error" as const,
            actualOutput: null,
            stderr: batch.compile_error,
            runtimeMs: null,
            memoryKb: null,
          }))
        );
      } else {
        // Map results back to test cases
        onTestCasesChange(
          testCases.map((tc, i) => {
            const result = batch.results[i];
            if (!result) {
              return { ...tc, verdict: "error" as const, stderr: "No result returned" };
            }
            const actual = result.stdout;
            const expected = tc.expectedOutput;
            const pass =
              expected.trim() === ""
                ? true
                : normalizeOutput(actual) === normalizeOutput(expected);

            return {
              ...tc,
              actualOutput: actual,
              stderr: result.stderr || null,
              verdict: (result.exit_code !== 0 ? "error" : pass ? "pass" : "fail") as TestCase["verdict"],
              runtimeMs: result.runtime_ms,
              memoryKb: result.memory_kb,
            };
          })
        );
      }
    } catch (err) {
      onTestCasesChange(
        testCases.map((tc) => ({
          ...tc,
          verdict: "error" as const,
          stderr: err instanceof Error ? err.message : String(err),
        }))
      );
    }

    onRunningChange(false);
  }, [isRunning, testCases, onRunBatch, onTestCasesChange, onRunningChange]);

  // ─── Pass/Fail Counter ─────────────────────────────────────────────────
  const passed = testCases.filter((tc) => tc.verdict === "pass").length;
  const failed = testCases.filter((tc) => tc.verdict === "fail" || tc.verdict === "error").length;
  const total = testCases.length;
  const ran = passed + failed;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="tc-panel">
      {/* ── Sidebar: test case list ── */}
      <div className="tc-sidebar">
        <div className="tc-sidebar-header">
          <span className="tc-sidebar-title">Test Cases</span>
          <button
            className="btn btn-ghost btn-sm tc-add-btn"
            onClick={handleAdd}
            title="Add test case"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="tc-list">
          {testCases.map((tc, idx) => (
            <div
              key={tc.id}
              className={`tc-list-item ${selectedId === tc.id ? "active" : ""}`}
              onClick={() => setSelectedId(tc.id)}
            >
              <VerdictDot verdict={tc.verdict} />
              <span className="tc-list-label">TC{idx + 1}</span>
              {tc.runtimeMs !== null && (
                <span className="tc-list-time">{tc.runtimeMs}ms</span>
              )}
              <button
                className="tc-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(tc.id);
                }}
                title="Remove"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Run All + Counter */}
        <div className="tc-sidebar-footer">
          {ran > 0 && (
            <div className="tc-counter">
              <span className={passed === total && total > 0 ? "tc-counter-pass" : passed > 0 ? "tc-counter-partial" : "tc-counter-fail"}>
                {passed}/{total} passed
              </span>
            </div>
          )}
          <button
            className="btn btn-primary tc-run-all-btn"
            onClick={handleRunAll}
            disabled={isRunning || testCases.length === 0}
          >
            <PlayCircle size={12} />
            {isRunning ? "Running..." : "Run All"}
          </button>
        </div>
      </div>

      {/* ── Main area: selected test case ── */}
      <div className="tc-main">
        {selected ? (
          <>
            {/* Three-column layout: Input | Expected | Actual */}
            <div className="tc-columns">
              <div className="tc-column">
                <div className="tc-col-header">
                  <span>Input</span>
                </div>
                <textarea
                  className="tc-textarea"
                  value={selected.input}
                  onChange={(e) => updateCase(selected.id, { input: e.target.value })}
                  placeholder="Enter test input..."
                  spellCheck={false}
                />
              </div>

              <div className="tc-column">
                <div className="tc-col-header">
                  <span>Expected Output</span>
                </div>
                <textarea
                  className="tc-textarea"
                  value={selected.expectedOutput}
                  onChange={(e) => updateCase(selected.id, { expectedOutput: e.target.value })}
                  placeholder="Enter expected output (optional)..."
                  spellCheck={false}
                />
              </div>

              <div className="tc-column">
                <div className="tc-col-header tc-actual-header">
                  <span>Actual Output</span>
                  {selected.verdict !== "pending" && selected.verdict !== "running" && (
                    <div className="tc-actual-meta">
                      {selected.runtimeMs !== null && (
                        <span className="tc-meta-chip">
                          <Clock size={10} />
                          {selected.runtimeMs}ms
                        </span>
                      )}
                      {selected.memoryKb !== null && selected.memoryKb > 0 && (
                        <span className="tc-meta-chip">
                          {selected.memoryKb}KB
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="tc-actual-output">
                  {selected.verdict === "running" ? (
                    <div className="tc-running-indicator">
                      <div className="spinner" />
                      <span>Running...</span>
                    </div>
                  ) : selected.actualOutput !== null ? (
                    <pre className="tc-actual-pre">{selected.actualOutput}</pre>
                  ) : selected.stderr ? (
                    <pre className="tc-actual-pre tc-stderr">{selected.stderr}</pre>
                  ) : (
                    <span className="tc-placeholder">Run to see output</span>
                  )}
                </div>
              </div>
            </div>

            {/* Run single + verdict bar */}
            <div className="tc-bottom-bar">
              <button
                className="btn btn-ghost"
                onClick={() => handleRunSingle(selected)}
                disabled={isRunning}
              >
                <PlayCircle size={12} />
                Run This Case
              </button>

              {selected.verdict !== "pending" && selected.verdict !== "running" && (
                <div className="tc-verdict-display">
                  <VerdictBadge verdict={selected.verdict} />
                </div>
              )}

              {selected.verdict === "fail" && selected.actualOutput !== null && (
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setShowDiff(showDiff === selected.id ? null : selected.id)
                  }
                >
                  {showDiff === selected.id ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  {showDiff === selected.id ? "Hide Diff" : "Show Diff"}
                </button>
              )}
            </div>

            {/* Diff viewer (for failed cases) */}
            {showDiff === selected.id && selected.actualOutput !== null && (
              <div className="tc-diff-section">
                <DiffViewer
                  expected={selected.expectedOutput}
                  actual={selected.actualOutput}
                />
              </div>
            )}
          </>
        ) : (
          <div className="tc-empty-state">
            <span>Add a test case to get started</span>
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={12} />
              Add Test Case
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictDot({ verdict }: { verdict: TestCase["verdict"] }) {
  switch (verdict) {
    case "pass":
      return <CheckCircle2 size={12} className="tc-dot tc-dot-pass" />;
    case "fail":
      return <XCircle size={12} className="tc-dot tc-dot-fail" />;
    case "error":
      return <XCircle size={12} className="tc-dot tc-dot-error" />;
    case "running":
      return <div className="spinner tc-dot-spinner" style={{ width: 12, height: 12 }} />;
    default:
      return <Circle size={12} className="tc-dot tc-dot-pending" />;
  }
}

function VerdictBadge({ verdict }: { verdict: TestCase["verdict"] }) {
  const config = {
    pass: { label: "Accepted", className: "tc-badge-pass", icon: <CheckCircle2 size={12} /> },
    fail: { label: "Wrong Answer", className: "tc-badge-fail", icon: <XCircle size={12} /> },
    error: { label: "Runtime Error", className: "tc-badge-error", icon: <XCircle size={12} /> },
    pending: { label: "Pending", className: "tc-badge-pending", icon: <Circle size={12} /> },
    running: { label: "Running", className: "tc-badge-pending", icon: <Circle size={12} /> },
  };

  const c = config[verdict];
  return (
    <span className={`tc-verdict-badge ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}
