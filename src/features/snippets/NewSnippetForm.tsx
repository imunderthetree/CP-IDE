// features/snippets/NewSnippetForm.tsx — Inline form for creating personal snippets.
//
// Rendered at the bottom of the snippet list, no modal needed.
// Supports title, language, tags (comma separated), and code textarea.

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import type { SnippetLanguage } from "./types";

interface NewSnippetFormProps {
  onSave: (data: {
    title: string;
    language: SnippetLanguage;
    tags: string[];
    code: string;
    description: string;
  }) => void;
  onCancel: () => void;
}

const LANGUAGE_OPTIONS: { value: SnippetLanguage; label: string }[] = [
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

export default function NewSnippetForm({ onSave, onCancel }: NewSnippetFormProps) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<SnippetLanguage>("cpp");
  const [tagsInput, setTagsInput] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !code.trim()) return;

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      onSave({ title: title.trim(), language, tags, code, description: description.trim() });
    },
    [title, language, tagsInput, code, description, onSave]
  );

  const isValid = title.trim().length > 0 && code.trim().length > 0;

  return (
    <form className="new-snippet-form" onSubmit={handleSubmit}>
      <div className="new-snippet-header">
        <span className="new-snippet-title">
          <Plus size={12} /> New Snippet
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          title="Cancel"
        >
          <X size={12} />
        </button>
      </div>

      <div className="new-snippet-field">
        <label className="new-snippet-label" htmlFor="snippet-title">Title</label>
        <input
          id="snippet-title"
          className="new-snippet-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Persistent Segment Tree"
          autoFocus
        />
      </div>

      <div className="new-snippet-field">
        <label className="new-snippet-label">Language</label>
        <div className="new-snippet-lang-pills">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-pill ${language === opt.value ? "active" : ""}`}
              onClick={() => setLanguage(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="new-snippet-field">
        <label className="new-snippet-label" htmlFor="snippet-desc">Description</label>
        <input
          id="snippet-desc"
          className="new-snippet-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)"
        />
      </div>

      <div className="new-snippet-field">
        <label className="new-snippet-label" htmlFor="snippet-tags">Tags</label>
        <input
          id="snippet-tags"
          className="new-snippet-input"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="graph, dp, math (comma separated)"
        />
      </div>

      <div className="new-snippet-field">
        <label className="new-snippet-label" htmlFor="snippet-code">Code</label>
        <textarea
          id="snippet-code"
          className="new-snippet-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={8}
          spellCheck={false}
        />
      </div>

      <div className="new-snippet-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid}
        >
          <Plus size={12} /> Save Snippet
        </button>
      </div>
    </form>
  );
}
