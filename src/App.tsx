// App.tsx — CP-IDE application shell.
//
// Provides the main layout: left sidebar with icon navigation,
// toolbar with language/flag controls, run button, and complexity toggle,
// Monaco editor in the center, terminal panel at the bottom,
// snippet library panel on the right, and complexity panel (split view).

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Settings,
  Play,
  Square,
  BarChart3,
} from "lucide-react";
import { Editor, LanguageSwitcher, CompileFlagToggle, Terminal, createTestCase } from "./features/editor";
import type { TestCase, TestRunResult, BatchRunResult } from "./features/editor";
import { Dashboard } from "./features/dashboard";
import { SettingsPage } from "./features/settings";
import { SnippetsPanel } from "./features/snippets";
import type { PanelMode } from "./features/snippets";
import { ComplexityPanel } from "./features/complexity";
import { EditorProvider } from "./context/EditorContext";
import { ExtensionProvider } from "./context/ExtensionContext";
import { apiInstance, ExtensionRunRequest } from "./lib/pluginApi";
import { loadAppearance, applyAppearance } from "./lib/themes";
import { runCode, runBatch, type RunCodeResponse } from "./lib/tauriClient";
import type { Language } from "./features/editor/LanguageSwitcher";
import type { CompileMode } from "./features/editor/CompileFlagToggle";
import "./App.css";

// Apply saved theme immediately (before first render)
applyAppearance(loadAppearance());

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

// ─── Saved Split Ratio ───────────────────────────────────────────────────────

const SPLIT_RATIO_KEY = "cpide-complexity-split";
const DEFAULT_SPLIT = 60; // editor gets 60%, panel gets 40%

function loadSplitRatio(): number {
  try {
    const saved = localStorage.getItem(SPLIT_RATIO_KEY);
    if (saved) return Math.max(30, Math.min(80, Number(saved)));
  } catch { /* ignore */ }
  return DEFAULT_SPLIT;
}

// ─── App Component ────────────────────────────────────────────────────────────

export default function App() {
  // Navigation state
  const [activeView, setActiveView] = useState<NavView>("editor");

  // Snippets panel state
  const [snippetsPanelMode, setSnippetsPanelMode] = useState<PanelMode>("hidden");

  // Complexity panel state
  const [showComplexity, setShowComplexity] = useState(false);
  const [splitRatio, setSplitRatio] = useState(loadSplitRatio);

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

  // Complexity split drag state
  const [isSplitDragging, setIsSplitDragging] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);


  // Keep code ref up-to-date for test case runner & plugins
  const codeRef = useRef(code);
  codeRef.current = code;
  const languageRef = useRef(language);
  languageRef.current = language;
  const compileModeRef = useRef(compileMode);
  compileModeRef.current = compileMode;

  // ─── Wire up Plugin API ──────────────────────────────────────────────────

  useEffect(() => {
    apiInstance._internal.getEditorText = () => codeRef.current;
    apiInstance._internal.setEditorText = (text: string) => setCode(text);
  }, []);

  // ─── Save split ratio ────────────────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_RATIO_KEY, String(splitRatio));
    } catch { /* ignore */ }
  }, [splitRatio]);

  // ─── Sidebar Click Handler ──────────────────────────────────────────────

  const handleNavClick = useCallback(
    (id: NavView) => {
      if (id === "snippets") {
        if (activeView === "editor") {
          setSnippetsPanelMode((prev) =>
            prev === "hidden" ? "overlay" : "hidden"
          );
        } else {
          setActiveView("editor");
          setSnippetsPanelMode("overlay");
        }
      } else {
        setActiveView(id);
        if (id !== "editor") {
          setSnippetsPanelMode("hidden");
        }
      }
    },
    [activeView]
  );

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

    // Prepare base request payload for plugins
    let reqPayload: ExtensionRunRequest = {
      code,
      language,
      stdin,
    };

    try {
      // Execute Plugin Hooks
      for (const hook of apiInstance._internal.beforeRunHooks) {
        try {
          const modReq = await hook(reqPayload);
          if (modReq) reqPayload = modReq;
        } catch (hookErr) {
          console.error("Plugin beforeRun hook failed:", hookErr);
        }
      }

      const response = await runCode({
        code: reqPayload.code,
        language: reqPayload.language as Language,
        stdin: reqPayload.stdin,
        flags: compileMode,
      });

      setResult(response);

      for (const hook of apiInstance._internal.afterRunHooks) {
        try {
          hook(response);
        } catch (hookErr) {
           console.error("Plugin afterRun hook failed:", hookErr);
        }
      }
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

  // ─── Complexity Split Drag ────────────────────────────────────────────────

  const handleSplitDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsSplitDragging(true);

      const handleMouseMove = (e: MouseEvent) => {
        if (!splitContainerRef.current) return;
        const rect = splitContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(30, Math.min(80, (x / rect.width) * 100));
        setSplitRatio(Math.round(pct));
      };

      const handleMouseUp = () => {
        setIsSplitDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    []
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ExtensionProvider>
    <EditorProvider>
      <div className="app-layout">
        {/* ── Sidebar ── */}
        <nav className="sidebar">
          <div className="sidebar-logo" title="CP-IDE v0.8">
            CP
          </div>

          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`sidebar-icon tooltip-wrapper ${
                item.id === "snippets"
                  ? snippetsPanelMode !== "hidden"
                    ? "active"
                    : ""
                  : activeView === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() => handleNavClick(item.id)}
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
        <div className={`main-content ${snippetsPanelMode === "pinned" ? "with-snippets-panel" : ""}`}>
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

                <div className="toolbar-separator" />

                {/* Complexity toggle */}
                <div className="toolbar-group">
                  <button
                    className={`btn ${showComplexity ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setShowComplexity((v) => !v)}
                    title="Toggle complexity analysis panel"
                  >
                    <BarChart3 size={12} />
                    Complexity
                  </button>
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

              {/* Editor + Complexity Split */}
              <div
                ref={splitContainerRef}
                className={`editor-split-container ${showComplexity ? "split-active" : ""} ${isSplitDragging ? "dragging" : ""}`}
              >
                <div
                  className="editor-split-left"
                  style={showComplexity ? { width: `${splitRatio}%` } : { width: "100%" }}
                >
                  <Editor
                    value={code}
                    onChange={setCode}
                    language={language}
                  />
                </div>

                {showComplexity && (
                  <>
                    <div
                      className="split-divider"
                      onMouseDown={handleSplitDragStart}
                    />
                    <div
                      className="editor-split-right"
                      style={{ width: `${100 - splitRatio}%` }}
                    >
                      <ComplexityPanel code={code} language={language} />
                    </div>
                  </>
                )}
              </div>

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
              <span>v0.8.0</span>
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

        {/* ── Snippets Panel ── */}
        <SnippetsPanel
          mode={snippetsPanelMode}
          onModeChange={setSnippetsPanelMode}
        />
      </div>
    </EditorProvider>
    </ExtensionProvider>
  );
}
