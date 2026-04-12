// features/editor/Editor.tsx — Monaco editor wrapper for CP-IDE.
//
// Provides a full-height code editor with syntax highlighting,
// custom dark theme, language-aware mode switching,
// and complexity analysis hover providers (Layer 1 + 2).

import { useRef, useCallback } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditor } from "../../context/EditorContext";
import { registerComplexityHoverProvider } from "../../lib/complexity_static";
import { loadAppearance } from "../../lib/themes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorProps {
  /** Current source code value. */
  value: string;
  /** Called when the user edits code. */
  onChange: (value: string) => void;
  /** Monaco language identifier: "cpp", "python", or "java". */
  language: string;
}

// ─── Language → Monaco Language Map ───────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  cpp: "cpp",
  python: "python",
  java: "java",
};

// ─── Custom Theme Definition ──────────────────────────────────────────────────

const CP_IDE_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "555d68", fontStyle: "italic" },
    { token: "keyword", foreground: "00e5a0" },
    { token: "string", foreground: "a5d6ff" },
    { token: "number", foreground: "d29922" },
    { token: "type", foreground: "58a6ff" },
    { token: "function", foreground: "e6edf3" },
    { token: "variable", foreground: "e6edf3" },
    { token: "operator", foreground: "8b949e" },
    { token: "delimiter", foreground: "8b949e" },
    { token: "preprocessor", foreground: "f85149" },
  ],
  colors: {
    "editor.background": "#0a0e14",
    "editor.foreground": "#e6edf3",
    "editor.lineHighlightBackground": "#151a2240",
    "editor.selectionBackground": "#1e253080",
    "editor.inactiveSelectionBackground": "#1e253040",
    "editorCursor.foreground": "#00e5a0",
    "editorLineNumber.foreground": "#3a4555",
    "editorLineNumber.activeForeground": "#8b949e",
    "editorIndentGuide.background": "#1e2530",
    "editorIndentGuide.activeBackground": "#2a3240",
    "editorWhitespace.foreground": "#1e2530",
    "editor.selectionHighlightBackground": "#00e5a015",
    "editorBracketMatch.background": "#00e5a020",
    "editorBracketMatch.border": "#00e5a040",
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#2a324060",
    "scrollbarSlider.hoverBackground": "#3a455580",
    "scrollbarSlider.activeBackground": "#3a4555a0",
    "editorOverviewRuler.border": "#00000000",
    "editorGutter.background": "#0a0e14",
    "minimap.background": "#0a0e14",
  },
};

// ─── Default Editor Options ───────────────────────────────────────────────────

function getEditorOptions(): editor.IStandaloneEditorConstructionOptions {
  const appearance = loadAppearance();
  return {
    fontSize: appearance.fontSize,
    fontFamily: appearance.fontFamily,
    fontLigatures: true,
    lineHeight: Math.round(appearance.fontSize * 1.57),
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: "line",
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    smoothScrolling: true,
    tabSize: 4,
    wordWrap: "off",
    automaticLayout: true,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
    },
    quickSuggestions: true,
    folding: true,
    glyphMargin: false,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    contextmenu: true,
  };
}

// Track whether hover providers have been registered (register once globally)
let hoverProvidersRegistered = false;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Editor({ value, onChange, language }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { setEditor } = useEditor();

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setEditor(editor);

    // Register custom theme
    monaco.editor.defineTheme("cp-ide-dark", CP_IDE_THEME);
    monaco.editor.setTheme("cp-ide-dark");

    // Register complexity hover providers (once)
    if (!hoverProvidersRegistered) {
      registerComplexityHoverProvider(monaco as typeof import("monaco-editor"));
      hoverProvidersRegistered = true;
    }

    // Focus editor on mount
    editor.focus();
  }, [setEditor]);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? "");
    },
    [onChange]
  );

  return (
    <div className="editor-panel">
      <MonacoEditor
        height="100%"
        language={LANGUAGE_MAP[language] || "cpp"}
        theme="cp-ide-dark"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={getEditorOptions()}
        loading={
          <div className="coming-soon">
            <div className="spinner" />
          </div>
        }
      />
    </div>
  );
}
