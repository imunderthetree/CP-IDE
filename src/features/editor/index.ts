// features/editor/index.ts — Barrel exports for the editor feature module.

export { default as Editor } from "./Editor";
export { default as LanguageSwitcher } from "./LanguageSwitcher";
export { default as CompileFlagToggle } from "./CompileFlagToggle";
export { default as Terminal } from "./Terminal";
export { default as TestCasesPanel } from "./TestCasesPanel";
export { default as DiffViewer } from "./DiffViewer";

export type { Language } from "./LanguageSwitcher";
export type { CompileMode } from "./CompileFlagToggle";
export type { TestCase, TestRunResult, BatchRunResult } from "./TestCasesPanel";
export { createTestCase } from "./TestCasesPanel";
