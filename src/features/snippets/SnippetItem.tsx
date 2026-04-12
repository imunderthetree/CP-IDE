// features/snippets/SnippetItem.tsx — Individual snippet card in the list.
//
// Shows title, language badge, tags, and an Insert button.
// Expands on click to show description + syntax-highlighted code preview.

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";
import type { Snippet } from "./types";

interface SnippetItemProps {
  snippet: Snippet;
  onInsert: (snippet: Snippet) => void;
  onDelete?: (id: string) => void;
}

/** Language badge color map. */
const LANG_COLORS: Record<string, string> = {
  cpp: "#58a6ff",
  python: "#3fb950",
  java: "#d29922",
  all: "#8b949e",
};

export default function SnippetItem({ snippet, onInsert, onDelete }: SnippetItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleInsert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInsert(snippet);
    },
    [onInsert, snippet]
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [snippet.code]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(snippet.id);
    },
    [onDelete, snippet.id]
  );

  const visibleTags = snippet.tags.slice(0, 3);
  const canDelete = snippet.source === "personal" || snippet.source === "community";

  return (
    <div className={`snippet-item ${expanded ? "expanded" : ""}`}>
      {/* Header row — always visible */}
      <div className="snippet-item-header" onClick={handleToggle} role="button">
        <div className="snippet-item-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>

        <div className="snippet-item-info">
          <div className="snippet-item-title-row">
            <span className="snippet-item-title">{snippet.title}</span>
            <span
              className="snippet-lang-badge"
              style={{ color: LANG_COLORS[snippet.language] ?? "#8b949e" }}
            >
              {snippet.language === "cpp" ? "C++" : snippet.language === "python" ? "PY" : snippet.language.toUpperCase()}
            </span>
          </div>

          <div className="snippet-item-tags">
            {visibleTags.map((tag) => (
              <span key={tag} className="snippet-tag-pill">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm snippet-insert-btn"
          onClick={handleInsert}
          title="Insert at cursor"
        >
          Insert
        </button>
      </div>

      {/* Expanded body — description + code preview */}
      {expanded && (
        <div className="snippet-item-body">
          {snippet.description && (
            <p className="snippet-description">{snippet.description}</p>
          )}

          <div className="snippet-code-preview">
            <div className="snippet-code-header">
              <span className="snippet-code-lang">
                {snippet.language === "cpp" ? "C++" : snippet.language}
              </span>
              <div className="snippet-code-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  <Copy size={11} />
                  {copied ? "Copied!" : "Copy"}
                </button>
                {canDelete && onDelete && (
                  <button
                    className="btn btn-ghost btn-sm snippet-delete-btn"
                    onClick={handleDelete}
                    title="Delete snippet"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
            <pre className="snippet-code-block">
              <code>{snippet.code}</code>
            </pre>
          </div>

          {snippet.author && (
            <div className="snippet-author">by {snippet.author}</div>
          )}
        </div>
      )}
    </div>
  );
}
