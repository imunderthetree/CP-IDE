// context/EditorContext.tsx — Exposes the Monaco editor instance via React Context.
//
// This allows the SnippetsPanel (and any other component) to insert code
// at the current cursor position without prop drilling.

import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import type { editor } from "monaco-editor";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface EditorContextValue {
  /** Ref to the current Monaco editor instance. May be null before mount. */
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
  /** Register the Monaco editor instance (called from Editor.tsx on mount). */
  setEditor: (instance: editor.IStandaloneCodeEditor) => void;
  /** Insert text at the current cursor position / replace selection. */
  insertAtCursor: (text: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EditorProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const setEditor = useCallback((instance: editor.IStandaloneCodeEditor) => {
    editorRef.current = instance;
  }, []);

  const insertAtCursor = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const selection = ed.getSelection();
    if (!selection) return;

    ed.executeEdits("snippet-insert", [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
    ed.focus();
  }, []);

  return (
    <EditorContext.Provider value={{ editorRef, setEditor, insertAtCursor }}>
      {children}
    </EditorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return ctx;
}
