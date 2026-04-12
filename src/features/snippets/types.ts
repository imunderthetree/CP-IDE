// features/snippets/types.ts — Snippet data model types.

/** Supported programming languages for snippets. */
export type SnippetLanguage = "cpp" | "python" | "java" | "all";

/** Where a snippet originates from. */
export type SnippetSource = "builtin" | "personal" | "community";

/** Full snippet data model. */
export interface Snippet {
  id: string;
  title: string;
  description: string;
  language: SnippetLanguage;
  tags: string[];
  code: string;
  source: SnippetSource;
  author?: string;
  insertMode: "cursor";
}

/** Lightweight snippet metadata (used in community index). */
export interface SnippetMeta {
  id: string;
  title: string;
  language: SnippetLanguage;
  tags: string[];
  author: string;
  path: string;
}

/** Community index response shape. */
export interface CommunityIndex {
  snippets: SnippetMeta[];
}

/** Valid tag values for snippets. */
export const SNIPPET_TAGS = [
  "graph",
  "tree",
  "dp",
  "math",
  "string",
  "geometry",
  "data-structure",
  "sorting",
  "search",
  "number-theory",
  "template",
] as const;

export type SnippetTag = (typeof SNIPPET_TAGS)[number];
