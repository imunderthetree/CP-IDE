// features/snippets/SnippetsPanel.tsx — Slide-in snippet library panel.
//
// Three states: hidden | overlay | pinned (editor shrinks when pinned).
// Combines built-in, personal, and community snippets with search & filters.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Pin,
  PinOff,
  X,
  Plus,
  WifiOff,
} from "lucide-react";
import { useEditor } from "../../context/EditorContext";
import { BUILTIN_SNIPPETS } from "./builtins";
import SnippetItem from "./SnippetItem";
import NewSnippetForm from "./NewSnippetForm";
import { getAllSnippets, savePersonalSnippet, deleteSnippet } from "../../lib/tauriClient";
import type { Snippet, SnippetLanguage, SnippetSource } from "./types";

// ─── Panel State Types ────────────────────────────────────────────────────────

export type PanelMode = "hidden" | "overlay" | "pinned";

interface SnippetsPanelProps {
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

type LanguageFilter = "all" | SnippetLanguage;
type SourceFilter = "all" | SnippetSource;

const LANGUAGE_PILLS: { value: LanguageFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

const SOURCE_PILLS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "builtin", label: "Built-in" },
  { value: "personal", label: "Personal" },
  { value: "community", label: "Community" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SnippetsPanel({ mode, onModeChange }: SnippetsPanelProps) {
  const { insertAtCursor } = useEditor();

  // Data state
  const [dbSnippets, setDbSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<LanguageFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Form state
  const [showForm, setShowForm] = useState(false);

  // ─── Load snippets from database ───────────────────────────────────────────

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const snippets = await getAllSnippets();
      setDbSnippets(snippets);
    } catch (err) {
      console.error("Failed to load snippets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "hidden") {
      loadSnippets();
    }
  }, [mode, loadSnippets]);

  // ─── All snippets combined ─────────────────────────────────────────────────

  const allSnippets = useMemo<Snippet[]>(() => {
    return [...BUILTIN_SNIPPETS, ...dbSnippets];
  }, [dbSnippets]);

  // ─── Filtered + Searched ───────────────────────────────────────────────────

  const filteredSnippets = useMemo(() => {
    const q = search.toLowerCase().trim();

    return allSnippets.filter((s) => {
      // Language filter
      if (langFilter !== "all" && s.language !== langFilter && s.language !== "all") {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && s.source !== sourceFilter) {
        return false;
      }

      // Search query
      if (q) {
        const inTitle = s.title.toLowerCase().includes(q);
        const inDesc = s.description.toLowerCase().includes(q);
        const inTags = s.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }

      return true;
    });
  }, [allSnippets, search, langFilter, sourceFilter]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleInsert = useCallback(
    (snippet: Snippet) => {
      insertAtCursor(snippet.code);
    },
    [insertAtCursor]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteSnippet(id);
        setDbSnippets((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error("Failed to delete snippet:", err);
      }
    },
    []
  );

  const handleSaveNew = useCallback(
    async (data: {
      title: string;
      language: SnippetLanguage;
      tags: string[];
      code: string;
      description: string;
    }) => {
      const snippet: Snippet = {
        id: `personal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: data.title,
        description: data.description,
        language: data.language,
        tags: data.tags,
        code: data.code,
        source: "personal",
        author: "You",
        insertMode: "cursor",
      };

      try {
        await savePersonalSnippet(snippet);
        setDbSnippets((prev) => [...prev, snippet]);
        setShowForm(false);
      } catch (err) {
        console.error("Failed to save snippet:", err);
      }
    },
    []
  );

  const handleClose = useCallback(() => {
    onModeChange("hidden");
  }, [onModeChange]);

  const handlePinToggle = useCallback(() => {
    onModeChange(mode === "pinned" ? "overlay" : "pinned");
  }, [mode, onModeChange]);

  // ─── Don't render if hidden ────────────────────────────────────────────────

  if (mode === "hidden") return null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay backdrop (only in overlay mode) */}
      {mode === "overlay" && (
        <div className="snippets-backdrop" onClick={handleClose} />
      )}

      <div className={`snippets-panel ${mode}`}>
        {/* Header */}
        <div className="snippets-header">
          <div className="snippets-header-left">
            <h2 className="snippets-title">Snippets</h2>
            {isOffline && (
              <span className="snippets-offline-badge" title="Community snippets unavailable">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <div className="snippets-header-actions">
            <button
              className={`btn btn-ghost btn-sm ${mode === "pinned" ? "active" : ""}`}
              onClick={handlePinToggle}
              title={mode === "pinned" ? "Unpin panel" : "Pin panel"}
            >
              {mode === "pinned" ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClose}
              title="Close panel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="snippets-search">
          <Search size={12} className="snippets-search-icon" />
          <input
            className="snippets-search-input"
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="snippets-filters">
          <div className="filter-row">
            {LANGUAGE_PILLS.map((pill) => (
              <button
                key={pill.value}
                className={`filter-pill ${langFilter === pill.value ? "active" : ""}`}
                onClick={() => setLangFilter(pill.value)}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="filter-row">
            {SOURCE_PILLS.map((pill) => (
              <button
                key={pill.value}
                className={`filter-pill source ${sourceFilter === pill.value ? "active" : ""}`}
                onClick={() => setSourceFilter(pill.value)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet List */}
        <div className="snippets-list">
          {loading ? (
            <div className="snippets-loading">
              <div className="spinner" />
              <span>Loading snippets…</span>
            </div>
          ) : filteredSnippets.length === 0 ? (
            <div className="snippets-empty">
              <span>No snippets match your filters</span>
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
              <SnippetItem
                key={snippet.id}
                snippet={snippet}
                onInsert={handleInsert}
                onDelete={snippet.source !== "builtin" ? handleDelete : undefined}
              />
            ))
          )}
        </div>

        {/* New Snippet Button / Form */}
        <div className="snippets-footer">
          {showForm ? (
            <NewSnippetForm
              onSave={handleSaveNew}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              className="btn btn-ghost snippets-new-btn"
              onClick={() => setShowForm(true)}
            >
              <Plus size={12} /> New Snippet
            </button>
          )}
        </div>
      </div>
    </>
  );
}
