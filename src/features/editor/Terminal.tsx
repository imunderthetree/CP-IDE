// features/editor/Terminal.tsx — Output panel with tabs for Output, Input, and Test Cases.
//
// Shows compilation results (stdout, stderr), execution metadata (time, memory),
// provides a stdin input textarea, and integrates the TestCasesPanel.

import { useState } from "react";
import { Terminal as TerminalIcon, Keyboard, FlaskConical } from "lucide-react";
import TestCasesPanel from "./TestCasesPanel";
import type { TestCase, TestRunResult, BatchRunResult } from "./TestCasesPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  runtime_ms: number;
  memory_kb: number;
}

interface TerminalProps {
  /** The latest execution result, or null if nothing has run yet. */
  result: ExecutionResult | null;
  /** Whether code is currently being compiled/run. */
  isRunning: boolean;
  /** Current stdin value. */
  stdin: string;
  /** Called when stdin changes. */
  onStdinChange: (value: string) => void;
  /** Test cases state. */
  testCases: TestCase[];
  /** Called when test cases change. */
  onTestCasesChange: (cases: TestCase[]) => void;
  /** Run a single test case. */
  onRunTestCase: (tc: TestCase) => Promise<TestRunResult>;
  /** Batch run: compile once, run all stdins. */
  onRunBatch: (stdins: string[]) => Promise<BatchRunResult>;
  /** Whether test cases are currently being run. */
  isTestRunning: boolean;
  /** Called when test running state changes. */
  onTestRunningChange: (running: boolean) => void;
}

// ─── Tab Definitions ──────────────────────────────────────────────────────────

type TabId = "output" | "input" | "testcases";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: "output", label: "Output", icon: <TerminalIcon size={12} /> },
  { id: "input", label: "Input", icon: <Keyboard size={12} /> },
  { id: "testcases", label: "Test Cases", icon: <FlaskConical size={12} /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Terminal({
  result,
  isRunning,
  stdin,
  onStdinChange,
  testCases,
  onTestCasesChange,
  onRunTestCase,
  onRunBatch,
  isTestRunning,
  onTestRunningChange,
}: TerminalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("output");

  // Count passed/total for tab badge
  const passedCount = testCases.filter((tc) => tc.verdict === "pass").length;
  const failedCount = testCases.filter((tc) => tc.verdict === "fail" || tc.verdict === "error").length;
  const totalCount = testCases.length;
  const ranCount = passedCount + failedCount;

  return (
    <div className="terminal-panel">
      {/* Tab bar */}
      <div className="terminal-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`terminal-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {/* Test case badge */}
            {tab.id === "testcases" && totalCount > 0 && ranCount > 0 && (
              <span
                className={`tc-tab-badge ${
                  passedCount === totalCount
                    ? "tc-tab-badge-pass"
                    : failedCount > 0
                      ? "tc-tab-badge-fail"
                      : ""
                }`}
              >
                {passedCount}/{totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="terminal-body">
        {activeTab === "output" ? (
          <>
            <div className="terminal-output">
              {isRunning ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="spinner" />
                  <span className="output-info">Compiling and running...</span>
                </div>
              ) : result ? (
                <>
                  {result.stderr && (
                    <div className="output-stderr">{result.stderr}</div>
                  )}
                  {result.stdout && (
                    <div className="output-stdout">{result.stdout}</div>
                  )}
                  {!result.stdout && !result.stderr && (
                    <span className="output-info">Program produced no output.</span>
                  )}
                </>
              ) : (
                <span className="output-info">
                  Press Ctrl+Enter or click Run to execute your code.
                </span>
              )}
            </div>

            {/* Execution metadata bar */}
            {result && !isRunning && (
              <div className="output-meta">
                <div className="meta-item">
                  <span className="label">Exit:</span>
                  <span className={`value ${result.exit_code === 0 ? "success" : "error"}`}>
                    {result.exit_code}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">Time:</span>
                  <span className="value">{result.runtime_ms} ms</span>
                </div>
                {result.memory_kb > 0 && (
                  <div className="meta-item">
                    <span className="label">Memory:</span>
                    <span className="value">{result.memory_kb} KB</span>
                  </div>
                )}
                <div className="meta-item">
                  <span className="label">Verdict:</span>
                  <span className={`value ${result.exit_code === 0 ? "success" : "error"}`}>
                    {result.exit_code === 0
                      ? "✓ OK"
                      : result.stderr.includes("Compilation Error")
                        ? "✗ CE"
                        : result.stderr.includes("Time Limit")
                          ? "✗ TLE"
                          : "✗ RE"}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : activeTab === "input" ? (
          /* Input tab */
          <div className="stdin-section">
            <div className="stdin-label">Standard Input (stdin)</div>
            <textarea
              className="stdin-textarea"
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder={"Paste or type your test input here...\n\nExample:\n5\n1 2 3 4 5"}
              spellCheck={false}
            />
          </div>
        ) : (
          /* Test Cases tab */
          <TestCasesPanel
            testCases={testCases}
            onTestCasesChange={onTestCasesChange}
            onRunSingle={onRunTestCase}
            onRunBatch={onRunBatch}
            isRunning={isTestRunning}
            onRunningChange={onTestRunningChange}
          />
        )}
      </div>
    </div>
  );
}
