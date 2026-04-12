// features/snippets/index.ts — Barrel exports for the snippets feature module.

export { default as SnippetsPanel } from "./SnippetsPanel";
export { default as SnippetItem } from "./SnippetItem";
export { default as NewSnippetForm } from "./NewSnippetForm";
export { BUILTIN_SNIPPETS } from "./builtins";

export type { Snippet, SnippetMeta, SnippetLanguage, SnippetSource } from "./types";
export type { PanelMode } from "./SnippetsPanel";
