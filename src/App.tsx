// App.tsx — CP-IDE application shell.
//
// Provides the main layout: left sidebar with icon navigation,
// toolbar with language/flag controls and run button,
// Monaco editor in the center, and terminal panel at the bottom.

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Settings,
  Play,
  Square,
} from "lucide-react";
import { Editor, LanguageSwitcher, CompileFlagToggle, Terminal, createTestCase } from "./features/editor";
import type { TestCase, TestRunResult, BatchRunResult } from "./features/editor";
import { Dashboard } from "./features/dashboard";
import { SettingsPage } from "./features/settings";
import { runCode, runBatch, type RunCodeResponse } from "./lib/tauriClient";
import type { Language } from "./features/editor/LanguageSwitcher";
import type { CompileMode } from "./features/editor/CompileFlagToggle";
import "./App.css";

// ─── Default Code Templates ──────────────────────────────────────────────────

const DEFAULT_CODE: Record<Language, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    cin >> n;
    
    cout << "Hello from CP-IDE! n = " << n << endl;
    
    return 0;
}
`,
  python: `import sys
input = sys.stdin.readline

def main():
    n = int(input())
    print(f"Hello from CP-IDE! n = {n}")

if __name__ == "__main__":
    main()
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println("Hello from CP-IDE! n = " + n);
    }
}
`,
};

// ─── Sidebar Navigation Items ─────────────────────────────────────────────────

type NavView = "editor" | "dashboard" | "snippets" | "settings";

interface NavItem {
  id: NavView;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "editor", icon: <Code2 size={18} />, label: "Editor" },
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { id: "snippets", icon: <BookOpen size={18} />, label: "Snippets" },
  { id: "settings", icon: <Settings size={18} />, label: "Settings" },
];

// ─── File Extension Map ───────────────────────────────────────────────────────

const FILE_EXT: Record<Language, string> = {
  cpp: "solution.cpp",
  python: "solution.py",
  java: "Main.java",
};

// ─── App Component ────────────────────────────────────────────────────────────

export default function App() {
  // Navigation state
  const [activeView, setActiveView] = useState<NavView>("editor");

  // Editor state
  const [language, setLanguage] = useState<Language>("cpp");
  const [compileMode, setCompileMode] = useState<CompileMode>("judge");
  const [code, setCode] = useState<string>(DEFAULT_CODE.cpp);
  const [stdin, setStdin] = useState<string>("5");

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RunCodeResponse | null>(null);

  // Test cases state
  const [testCases, setTestCases] = useState<TestCase[]>([
    createTestCase("5", "Hello from CP-IDE! n = 5"),
  ]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Terminal resize state
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Keep code ref up-to-date for test case runner
  const codeRef = useRef(code);
  codeRef.current = code;
  const languageRef = useRef(language);
  languageRef.current = language;
  const compileModeRef = useRef(compileMode);
  compileModeRef.current = compileMode;

  // ─── Language Change Handler ──────────────────────────────────────────────

  const handleLanguageChange = useCallback(
    (newLang: Language) => {
      setLanguage(newLang);
      setCode(DEFAULT_CODE[newLang]);
      setResult(null);
    },
    []
  );

  // ─── Run Code Handler ────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setResult(null);

    try {
      const response = await runCode({
        code,
        language,
        stdin,
        flags: compileMode,
      });
      setResult(response);
    } catch (err) {
      setResult({
        stdout: "",
        stderr: `Error: ${err instanceof Error ? err.message : String(err)}`,
        exit_code: -1,
        runtime_ms: 0,
        memory_kb: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, language, stdin, compileMode, isRunning]);

  // ─── Run Single Test Case Handler ─────────────────────────────────────────

  const handleRunTestCase = useCallback(
    async (tc: TestCase): Promise<TestRunResult> => {
      const response = await runCode({
        code: codeRef.current,
        language: languageRef.current,
        stdin: tc.input,
        flags: compileModeRef.current,
      });
      return response;
    },
    []
  );

  // ─── Run Batch Test Cases Handler ──────────────────────────────────────────

  const handleRunBatch = useCallback(
    async (stdins: string[]): Promise<BatchRunResult> => {
      const response = await runBatch({
        code: codeRef.current,
        language: languageRef.current,
        stdins,
        flags: compileModeRef.current,
      });
      return response;
    },
    []
  );

  // ─── Keyboard Shortcut: Ctrl+Enter to run ────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun]);

  // ─── Terminal Resize Handlers ─────────────────────────────────────────────

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startY: e.clientY, startHeight: terminalHeight };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = resizeRef.current.startY - e.clientY;
        const newHeight = Math.max(120, Math.min(600, resizeRef.current.startHeight + delta));
        setTerminalHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [terminalHeight]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-logo" title="CP-IDE v0.3">
          CP
        </div>

        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`sidebar-icon tooltip-wrapper ${activeView === item.id ? "active" : ""}`}
            onClick={() => setActiveView(item.id)}
            data-tooltip={item.label}
            role="button"
            aria-label={item.label}
          >
            {item.icon}
          </div>
        ))}

        <div className="sidebar-spacer" />
      </nav>

      {/* ── Main Content ── */}
      <div className="main-content">
        {activeView === "editor" ? (
          <>
            {/* Toolbar */}
            <div className="toolbar">
              <div className="toolbar-group">
                <LanguageSwitcher
                  language={language}
                  onLanguageChange={handleLanguageChange}
                />
              </div>

              <div className="toolbar-separator" />

              <div className="toolbar-group">
                <CompileFlagToggle
                  mode={compileMode}
                  onModeChange={setCompileMode}
                />
              </div>

              <div className="toolbar-spacer" />

              <div className="toolbar-group">
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}>
                  {FILE_EXT[language]}
                </span>
              </div>

              <div className="toolbar-separator" />

              <div className="toolbar-group">
                {isRunning ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {/* TODO: cancel */}}
                    title="Stop execution"
                  >
                    <Square size={12} />
                    Stop
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleRun}
                    title="Run code (Ctrl+Enter)"
                  >
                    <Play size={12} />
                    Run
                  </button>
                )}
              </div>
            </div>

            {/* Editor */}
            <Editor
              value={code}
              onChange={setCode}
              language={language}
            />

            {/* Resize Handle */}
            <div
              className={`resize-handle ${isResizing ? "dragging" : ""}`}
              onMouseDown={handleResizeStart}
            />

            {/* Terminal */}
            <div style={{ height: terminalHeight, flexShrink: 0 }}>
              <Terminal
                result={result}
                isRunning={isRunning}
                stdin={stdin}
                onStdinChange={setStdin}
                testCases={testCases}
                onTestCasesChange={setTestCases}
                onRunTestCase={handleRunTestCase}
                onRunBatch={handleRunBatch}
                isTestRunning={isTestRunning}
                onTestRunningChange={setIsTestRunning}
              />
            </div>
          </>
        ) : activeView === "dashboard" ? (
          <Dashboard />
        ) : activeView === "settings" ? (
          <SettingsPage />
        ) : (
          /* Coming soon placeholder for other views */
          <div className="coming-soon">
            <div className="coming-soon-icon">
              {NAV_ITEMS.find((n) => n.id === activeView)?.icon}
            </div>
            <div className="coming-soon-title">
              {NAV_ITEMS.find((n) => n.id === activeView)?.label}
            </div>
            <div className="coming-soon-subtitle">Coming in a future release</div>
          </div>
        )}

        {/* Status Bar */}
        <div className="statusbar">
          <div className="status-item">
            <span className="status-accent">●</span>
            <span>CP-IDE</span>
          </div>
          <div className="status-item">
            <span>v0.4.0</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="status-item">
            <span>{language.toUpperCase()}</span>
          </div>
          <div className="status-item">
            <span>{compileMode === "judge" ? "Judge (-O2)" : "Debug (-g)"}</span>
          </div>
          <div className="status-item">
            <span>Ctrl+Enter to run</span>
          </div>
        </div>
      </div>
    </div>
  );
}
