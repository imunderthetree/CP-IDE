// lib/complexity_static.ts — Layer 1: Static iterative complexity analysis.
//
// Scans function bodies for loop nesting, sorting calls, and bitmask patterns.
// Returns a heuristic complexity estimate under 5ms. No compilation needed.
// Registered as a Monaco hover provider for cpp, python, and java.

import type { editor, languages, Position, CancellationToken } from "monaco-editor";
import { analyzeRecurrence, formatRecurrenceTooltip } from "./complexity_recurrence";

// ─── Complexity Classes ───────────────────────────────────────────────────────

export type ComplexityClass =
  | "O(1)"
  | "O(log n)"
  | "O(n)"
  | "O(n log n)"
  | "O(n sqrt n)"
  | "O(n^2)"
  | "O(n^3)"
  | "O(2^n)"
  | "O(n!)";

// ─── Constraint Reference Table ──────────────────────────────────────────────

export const CONSTRAINT_TABLE: Record<ComplexityClass, { safeN: number; label: string }> = {
  "O(1)":        { safeN: Infinity, label: "always safe" },
  "O(log n)":    { safeN: Infinity, label: "always safe" },
  "O(n)":        { safeN: 1e8,      label: "safe to n = 10^8" },
  "O(n log n)":  { safeN: 1e7,      label: "safe to n = 10^7" },
  "O(n sqrt n)": { safeN: 1e5,      label: "safe to n = 10^5" },
  "O(n^2)":      { safeN: 5000,     label: "safe to n = 5,000" },
  "O(n^3)":      { safeN: 500,      label: "safe to n = 500" },
  "O(2^n)":      { safeN: 25,       label: "safe to n = 25" },
  "O(n!)":       { safeN: 12,       label: "safe to n = 12" },
};

// ─── Analysis Result ──────────────────────────────────────────────────────────

export interface StaticEstimate {
  complexity: ComplexityClass;
  reason: string;
  safeN: number;
  warning: string | null;
  hasRecursion: boolean;
}

// ─── Loop / Pattern Detection ─────────────────────────────────────────────────

// Patterns to detect for loops (C++/Java/Python)
const FOR_LOOP_PATTERNS = [
  /\bfor\s*\(/,                       // C++/Java for(
  /\bfor\s+\w+\s+in\s+range\s*\(/,   // Python for x in range(
  /\bfor\s+\w+\s+in\s+/,             // Python for x in ...
  /\bwhile\s*\(/,                     // C++/Java while(
  /\bwhile\s+/,                       // Python while
];

const SORT_PATTERNS = [
  /\bsort\s*\(/,                 // C++ std::sort( or Python .sort(
  /\bsorted\s*\(/,              // Python sorted(
  /\bArrays\.sort\s*\(/,        // Java Arrays.sort(
  /\bCollections\.sort\s*\(/,   // Java Collections.sort(
];

const BINARY_SEARCH_PATTERNS = [
  /\blower_bound\s*\(/,
  /\bupper_bound\s*\(/,
  /\bbinary_search\s*\(/,
  /\bbisect_left\s*\(/,
  /\bbisect_right\s*\(/,
  /\bbisect\s*\(/,
  /\bArrays\.binarySearch\s*\(/,
  /\bCollections\.binarySearch\s*\(/,
  /\bmid\s*=\s*\(?.*?lo.*?\+.*?hi\)?/,  // mid = (lo + hi) / 2 pattern
];

const BITMASK_PATTERNS = [
  /\b1\s*<<\s*n\b/,
  /\b1\s*<<\s*\w+\b/,
  /\bfor\s*\(\s*\w+\s*=\s*0\s*;\s*\w+\s*<\s*\(\s*1\s*<</, // for(i=0; i<(1<<
  /\brange\s*\(\s*1\s*<</,                                  // range(1 << n)
];

// Recursion is detected via hasRecursion() below — no static pattern array needed.

const FACTORIAL_PATTERNS = [
  /\bnext_permutation\s*\(/,
  /\bprev_permutation\s*\(/,
  /\bfactorial\s*\(/,
  /\bpermutations\s*\(/,    // Python itertools.permutations
];

// ─── Function Extraction ──────────────────────────────────────────────────────

interface FunctionBlock {
  name: string;
  startLine: number;
  endLine: number;
  body: string;
}

/**
 * Extract function blocks from source code.
 * Simplified extraction — looks for function declarations and their braces/indentation.
 */
function extractFunctions(code: string, language: string): FunctionBlock[] {
  const lines = code.split("\n");
  const functions: FunctionBlock[] = [];

  if (language === "python") {
    // Python: detect `def name(`:
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^\s*def\s+(\w+)\s*\(/);
      if (match) {
        const name = match[1];
        const indent = lines[i].search(/\S/);
        let end = i + 1;
        while (end < lines.length) {
          const line = lines[end];
          if (line.trim() === "") { end++; continue; }
          if (line.search(/\S/) <= indent && line.trim() !== "") break;
          end++;
        }
        functions.push({
          name,
          startLine: i + 1,
          endLine: end,
          body: lines.slice(i, end).join("\n"),
        });
      }
    }
  } else {
    // C++/Java: detect function signatures followed by {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match common function signature patterns
      const funcMatch = line.match(
        /(?:(?:void|int|long|double|bool|string|auto|static|public|private|protected)\s+)+(\w+)\s*\([^)]*\)\s*(?:const\s*)?\{?\s*$/
      );
      if (funcMatch) {
        const name = funcMatch[1];
        // Find the opening brace
        let braceStart = i;
        if (!line.includes("{")) {
          while (braceStart < lines.length && !lines[braceStart].includes("{")) {
            braceStart++;
          }
        }
        if (braceStart >= lines.length) continue;

        // Count braces to find end
        let braceCount = 0;
        let end = braceStart;
        for (let j = braceStart; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === "{") braceCount++;
            if (ch === "}") braceCount--;
          }
          if (braceCount === 0) { end = j; break; }
        }
        functions.push({
          name,
          startLine: i + 1,
          endLine: end + 1,
          body: lines.slice(i, end + 1).join("\n"),
        });
      }
    }
  }

  return functions;
}

// ─── Count Nested Loops ───────────────────────────────────────────────────────

function countMaxNestedLoops(body: string): number {
  const lines = body.split("\n");
  let maxDepth = 0;
  let currentDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;

    const isLoop = FOR_LOOP_PATTERNS.some((p) => p.test(trimmed));
    if (isLoop) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    // Track brace-based scope exit (rough heuristic)
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    const netClose = closes - opens;
    if (netClose > 0) {
      currentDepth = Math.max(0, currentDepth - netClose);
    }
  }

  return maxDepth;
}

// ─── Detect Patterns ──────────────────────────────────────────────────────────

function hasSort(body: string): boolean {
  return SORT_PATTERNS.some((p) => p.test(body));
}

function hasBinarySearch(body: string): boolean {
  return BINARY_SEARCH_PATTERNS.some((p) => p.test(body));
}

function hasBitmask(body: string): boolean {
  return BITMASK_PATTERNS.some((p) => p.test(body));
}

function hasFactorial(body: string): boolean {
  return FACTORIAL_PATTERNS.some((p) => p.test(body));
}

function hasRecursion(body: string, funcName: string): boolean {
  // Check if the function calls itself (not in a comment)
  const lines = body.split("\n");
  const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, "g");
  let callCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;
    // Skip the function definition line itself
    if (trimmed.match(new RegExp(`(?:def|void|int|long|auto)\\s+${funcName}\\s*\\(`))) continue;
    const matches = trimmed.match(callPattern);
    if (matches) callCount += matches.length;
  }

  return callCount > 0;
}

// ─── Analyze Function Body ───────────────────────────────────────────────────

export function analyzeBody(body: string, funcName: string): StaticEstimate {
  // Check for recursion first — hand off to Layer 2
  if (hasRecursion(body, funcName)) {
    return {
      complexity: "O(n)", // placeholder — Layer 2 will override
      reason: "Recursive function — see recurrence analysis below",
      safeN: CONSTRAINT_TABLE["O(n)"].safeN,
      warning: null,
      hasRecursion: true,
    };
  }

  // Check for factorial patterns
  if (hasFactorial(body)) {
    return {
      complexity: "O(n!)",
      reason: "Detected permutation/factorial enumeration",
      safeN: CONSTRAINT_TABLE["O(n!)"].safeN,
      warning: "Warning: Will likely TLE for n > 12",
      hasRecursion: false,
    };
  }

  // Check for bitmask patterns
  if (hasBitmask(body)) {
    return {
      complexity: "O(2^n)",
      reason: "Detected bitmask enumeration (1 << n)",
      safeN: CONSTRAINT_TABLE["O(2^n)"].safeN,
      warning: "Warning: Will likely TLE for n > 25",
      hasRecursion: false,
    };
  }

  const nestDepth = countMaxNestedLoops(body);
  const sortFound = hasSort(body);
  const bsearchFound = hasBinarySearch(body);

  // Sort + loop or binary search + loop -> O(n log n)
  if (sortFound && nestDepth <= 1) {
    return {
      complexity: "O(n log n)",
      reason: "Detected: sort() call" + (nestDepth === 1 ? " + 1 loop" : ""),
      safeN: CONSTRAINT_TABLE["O(n log n)"].safeN,
      warning: null,
      hasRecursion: false,
    };
  }

  // Loop + inner binary search
  if (nestDepth >= 1 && bsearchFound) {
    return {
      complexity: "O(n log n)",
      reason: `Detected: ${nestDepth} loop(s) + binary search`,
      safeN: CONSTRAINT_TABLE["O(n log n)"].safeN,
      warning: null,
      hasRecursion: false,
    };
  }

  // Sort + nested loop
  if (sortFound && nestDepth >= 2) {
    const cls: ComplexityClass = nestDepth === 2 ? "O(n^2)" : "O(n^3)";
    return {
      complexity: cls,
      reason: `Detected: sort() + ${nestDepth} nested loops`,
      safeN: CONSTRAINT_TABLE[cls].safeN,
      warning: CONSTRAINT_TABLE[cls].safeN <= 5000
        ? `Warning: Will likely TLE for n > ${CONSTRAINT_TABLE[cls].safeN.toLocaleString()}`
        : null,
      hasRecursion: false,
    };
  }

  // Pure loop nesting
  if (nestDepth >= 3) {
    return {
      complexity: "O(n^3)",
      reason: `Detected: ${nestDepth} nested loops`,
      safeN: CONSTRAINT_TABLE["O(n^3)"].safeN,
      warning: "Warning: Will likely TLE for n > 500",
      hasRecursion: false,
    };
  }
  if (nestDepth === 2) {
    return {
      complexity: "O(n^2)",
      reason: "Detected: 2 nested loops",
      safeN: CONSTRAINT_TABLE["O(n^2)"].safeN,
      warning: "Warning: Will likely TLE for n > 5,000",
      hasRecursion: false,
    };
  }
  if (nestDepth === 1) {
    return {
      complexity: "O(n)",
      reason: "Detected: 1 loop",
      safeN: CONSTRAINT_TABLE["O(n)"].safeN,
      warning: null,
      hasRecursion: false,
    };
  }

  // No loops detected
  return {
    complexity: "O(1)",
    reason: "No loops or recursion detected",
    safeN: CONSTRAINT_TABLE["O(1)"].safeN,
    warning: null,
    hasRecursion: false,
  };
}

// ─── Format Tooltip ───────────────────────────────────────────────────────────

export function formatStaticTooltip(estimate: StaticEstimate): string {
  const lines: string[] = [];
  lines.push(`**${estimate.complexity}** — estimated`);
  lines.push(estimate.reason);

  if (estimate.safeN !== Infinity) {
    lines.push(`Safe up to n = ${estimate.safeN.toLocaleString()}`);
  } else {
    lines.push("Safe for any input size");
  }

  if (estimate.warning) {
    lines.push("");
    lines.push(`⚠️ ${estimate.warning}`);
  }

  return lines.join("\n\n");
}

// ─── Monaco Hover Provider ───────────────────────────────────────────────────

/**
 * Register complexity hover providers for all supported languages.
 * Call once after Monaco is available (in Editor.tsx onMount).
 */
export function registerComplexityHoverProvider(
  monaco: typeof import("monaco-editor")
): void {
  const languages = ["cpp", "python", "java"];

  for (const lang of languages) {
    monaco.languages.registerHoverProvider(lang, {
      provideHover(
        model: editor.ITextModel,
        position: Position,
        _token: CancellationToken
      ): languages.ProviderResult<languages.Hover> {
        const code = model.getValue();
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const hoveredWord = word.word;
        const detectedLang = lang;

        // Extract functions from the code
        const functions = extractFunctions(code, detectedLang);

        // Find if hovering over a function name
        const targetFunc = functions.find((f) => f.name === hoveredWord);

        if (targetFunc) {
          const estimate = analyzeBody(targetFunc.body, targetFunc.name);
          // Import recurrence analysis lazily
          let tooltip = formatStaticTooltip(estimate);

          if (estimate.hasRecursion) {
            // Analyze recurrence (Layer 2)
            try {
              const recResult = analyzeRecurrence(targetFunc.body, targetFunc.name, detectedLang);
              if (recResult) {
                tooltip = formatRecurrenceTooltip(recResult);
              }
            } catch {
              // Layer 2 analysis failed — keep static estimate
            }
          }

          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
            contents: [
              { value: "**📊 Complexity Analysis**", isTrusted: true },
              { value: tooltip, isTrusted: true },
            ],
          };
        }

        // If no function found at hover position, check if cursor is in a function body
        const containingFunc = functions.find(
          (f) => position.lineNumber >= f.startLine && position.lineNumber <= f.endLine
        );

        if (containingFunc && hoveredWord === containingFunc.name) {
          const estimate = analyzeBody(containingFunc.body, containingFunc.name);
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
            contents: [
              { value: "**📊 Complexity Analysis**", isTrusted: true },
              { value: formatStaticTooltip(estimate), isTrusted: true },
            ],
          };
        }

        return null;
      },
    });
  }
}
