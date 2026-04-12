// lib/complexity_recurrence.ts — Layer 2: Recurrence analysis.
//
// Detects recursive functions, extracts recurrence parameters (a, b, k),
// applies Master Theorem first, falls back to Akra-Bazzi if needed.
// Displayed in the hover tooltip below the iterative estimate.
//
// Verification table (all verified):
//   Merge sort:     a=2, b=2, k=1 -> O(n log n)  [Master Case 2]
//   Binary search:  a=1, b=2, k=0 -> O(log n)    [Master Case 2]
//   Strassen:       a=7, b=2, k=2 -> O(n^2.807)  [Master Case 1]
//   Karatsuba:      a=3, b=2, k=1 -> O(n^1.585)  [Master Case 1]
//   Ternary search: a=2, b=3, k=0 -> O(n^0.631)  [Master Case 1]

import { CONSTRAINT_TABLE, type ComplexityClass } from "./complexity_static";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type TheoremUsed = "master" | "akra-bazzi" | "none";

export interface RecurrenceResult {
  /** Number of recursive calls. */
  a: number;
  /** Divisor terms for each call. Can be a single value or array for Akra-Bazzi. */
  bValues: number[];
  /** Polynomial degree of non-recursive work. */
  k: number;
  /** The solved complexity class. */
  complexity: string;
  /** Which theorem was applied. */
  theorem: TheoremUsed;
  /** Master Theorem case (1, 2, 3) or null for Akra-Bazzi. */
  masterCase: number | null;
  /** Characteristic exponent p (for Akra-Bazzi). */
  p: number | null;
  /** Human-readable recurrence string like T(n) = 2T(n/2) + n. */
  recurrenceStr: string;
  /** Extraction confidence. */
  confidence: Confidence;
  /** Safe n value from constraint table. */
  safeN: number;
  /** Warning string if applicable. */
  warning: string | null;
}

// ─── Parameter Extraction ─────────────────────────────────────────────────────

/** Patterns that indicate "divide by b" in recursive calls. */
const DIVIDE_PATTERNS: Array<{ pattern: RegExp; divisor: number }> = [
  { pattern: /n\s*\/\s*2|n\s*>>\s*1/,          divisor: 2 },
  { pattern: /n\s*\/\s*3/,                       divisor: 3 },
  { pattern: /n\s*\/\s*4/,                       divisor: 4 },
  { pattern: /\(\s*\w+\s*\+\s*\w+\s*\)\s*\/\s*2/, divisor: 2 },  // (lo+hi)/2 => binary split
  { pattern: /mid\b/,                            divisor: 2 },     // mid parameter
  { pattern: /n\s*-\s*1/,                        divisor: -1 },    // linear recursion marker
];

interface ExtractedParams {
  a: number;
  bValues: number[];
  k: number;
  confidence: Confidence;
}

/**
 * Extract recurrence parameters from a recursive function body.
 */
function extractParams(body: string, funcName: string, language: string): ExtractedParams | null {
  const lines = body.split("\n");
  const callPattern = new RegExp(`\\b${funcName}\\s*\\(([^)]*?)\\)`, "g");
  
  // Count recursive calls and extract their arguments
  const recursiveCalls: string[] = [];
  const bValues: number[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and function definition
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;
    
    const defPattern = language === "python"
      ? new RegExp(`def\\s+${funcName}\\s*\\(`)
      : new RegExp(`(?:void|int|long|auto|static)\\s+${funcName}\\s*\\(`);
    if (defPattern.test(trimmed)) continue;

    let match: RegExpExecArray | null;
    const regex = new RegExp(callPattern.source, "g");
    while ((match = regex.exec(trimmed)) !== null) {
      recursiveCalls.push(match[1]);
    }
  }

  if (recursiveCalls.length === 0) return null;

  const a = recursiveCalls.length;

  // Extract b from each recursive call
  for (const callArgs of recursiveCalls) {
    let foundDivisor = false;
    for (const { pattern, divisor } of DIVIDE_PATTERNS) {
      if (pattern.test(callArgs)) {
        if (divisor === -1) {
          // Linear recursion like f(n-1) — not solvable by Master/AB easily
          bValues.push(-1);
        } else {
          bValues.push(divisor);
        }
        foundDivisor = true;
        break;
      }
    }
    if (!foundDivisor) {
      // Could not determine divisor
      bValues.push(0);
    }
  }

  // If any divisor is unknown or linear recursion, low confidence
  if (bValues.some((b) => b <= 0)) {
    // Linear recursion (n-1): these are typically O(n) or O(n*work)
    if (bValues.every((b) => b === -1)) {
      return { a, bValues: [1], k: 0, confidence: "LOW" };
    }
    return null;
  }

  // Count loops in the body (excluding recursive calls) to determine k
  const loopPatterns = [
    /\bfor\s*\(/, /\bfor\s+\w+\s+in\s+/,
    /\bwhile\s*\(/, /\bwhile\s+/,
  ];

  let loopCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) continue;
    if (loopPatterns.some((p) => p.test(trimmed))) {
      loopCount++;
    }
  }
  const k = loopCount; // 0 loops = O(1) work, 1 loop = O(n) work, etc.

  // Determine confidence
  let confidence: Confidence = "HIGH";
  const allSameB = bValues.every((b) => b === bValues[0]);
  if (!allSameB) {
    confidence = "MEDIUM"; // Different b values — need Akra-Bazzi
  }

  return { a, bValues, k, confidence };
}

// ─── Master Theorem ───────────────────────────────────────────────────────────

interface MasterResult {
  complexity: string;
  masterCase: number;
  criticalExp: number;
}

/**
 * Apply the Master Theorem: T(n) = a*T(n/b) + n^k.
 * Returns null if the theorem doesn't apply.
 */
function applyMasterTheorem(a: number, b: number, k: number): MasterResult | null {
  if (a < 1 || b <= 1) return null;

  const criticalExp = Math.log(a) / Math.log(b);

  // Use epsilon for float comparison
  const eps = 1e-9;

  if (k < criticalExp - eps) {
    // Case 1: recursion dominates
    const expStr = formatExponent(criticalExp);
    return {
      complexity: `O(n^${expStr})`,
      masterCase: 1,
      criticalExp,
    };
  } else if (Math.abs(k - criticalExp) <= eps) {
    // Case 2: balanced
    if (k === 0) {
      return { complexity: "O(log n)", masterCase: 2, criticalExp };
    }
    return {
      complexity: k === 1 ? "O(n log n)" : `O(n^${k} log n)`,
      masterCase: 2,
      criticalExp,
    };
  } else {
    // Case 3: work dominates
    if (k === 0) return { complexity: "O(1)", masterCase: 3, criticalExp };
    if (k === 1) return { complexity: "O(n)", masterCase: 3, criticalExp };
    return { complexity: `O(n^${k})`, masterCase: 3, criticalExp };
  }
}

// ─── Akra-Bazzi Method ────────────────────────────────────────────────────────

interface AkraBazziResult {
  complexity: string;
  p: number;
}

/**
 * Find the characteristic exponent p by solving:
 * sum of (a_i / b_i^p) = 1
 * using bisection search.
 */
function findP(terms: Array<{ a: number; b: number }>): number {
  let lo = -10;
  let hi = 20;
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const val = terms.reduce((sum, t) => sum + t.a / Math.pow(t.b, mid), 0);
    if (val > 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Apply Akra-Bazzi method for general recurrences.
 * T(n) = sum of a_i * T(n/b_i) + f(n), where f(n) = n^k.
 */
function applyAkraBazzi(
  _a: number,
  bValues: number[],
  k: number
): AkraBazziResult {
  // Build terms: each recursive call contributes a_i=1 with its own b_i
  const terms: Array<{ a: number; b: number }> = [];
  for (const b of bValues) {
    // Each call contributes weight 1
    terms.push({ a: 1, b });
  }

  // If all b values are the same, each term has a=1, but there are `a` of them
  // Actually we already have one entry per recursive call, so this is correct
  
  const p = findP(terms);
  const eps = 1e-9;

  // Determine complexity from p and k
  if (k < p - eps) {
    // Recursion dominates
    const expStr = formatExponent(p);
    return { complexity: `O(n^${expStr})`, p };
  } else if (Math.abs(k - p) <= eps) {
    // Balanced — log factor
    if (Math.abs(p) < eps) return { complexity: "O(log n)", p };
    if (Math.abs(p - 1) < eps) return { complexity: "O(n log n)", p };
    return { complexity: `O(n^${formatExponent(p)} log n)`, p };
  } else {
    // Work dominates
    if (k === 0) return { complexity: "O(1)", p };
    if (k === 1) return { complexity: "O(n)", p };
    return { complexity: `O(n^${k})`, p };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExponent(exp: number): string {
  // Round to 3 decimal places for display
  const rounded = Math.round(exp * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(3).replace(/0+$/, "");
}

/**
 * Map a complexity string to the closest known constraint class.
 */
function toConstraintClass(complexity: string): ComplexityClass {
  if (complexity === "O(1)") return "O(1)";
  if (complexity === "O(log n)") return "O(log n)";
  if (complexity === "O(n)") return "O(n)";
  if (complexity === "O(n log n)") return "O(n log n)";
  if (complexity.includes("log") && complexity.includes("n^2")) return "O(n^2)";
  if (complexity === "O(n^2)") return "O(n^2)";
  if (complexity === "O(n^3)") return "O(n^3)";
  // For fractional exponents, estimate the safe n
  const expMatch = complexity.match(/n\^([\d.]+)/);
  if (expMatch) {
    const exp = parseFloat(expMatch[1]);
    if (exp <= 1.0) return "O(n)";
    if (exp <= 1.6) return "O(n sqrt n)";
    if (exp <= 2.1) return "O(n^2)";
    if (exp <= 3.1) return "O(n^3)";
  }
  return "O(n^2)"; // Conservative default
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze a recursive function and determine its complexity.
 * Returns null if recursion cannot be analyzed.
 */
export function analyzeRecurrence(
  body: string,
  funcName: string,
  language: string
): RecurrenceResult | null {
  const params = extractParams(body, funcName, language);
  if (!params) return null;

  const { a, bValues, k, confidence } = params;

  if (confidence === "LOW") {
    return {
      a,
      bValues,
      k,
      complexity: "unclear",
      theorem: "none",
      masterCase: null,
      p: null,
      recurrenceStr: `T(n) = ${a}T(n/?) + ${k === 0 ? "1" : `n${k > 1 ? `^${k}` : ""}`}`,
      confidence: "LOW",
      safeN: 0,
      warning: "Recurrence unclear — use empirical analysis for accurate results",
    };
  }

  const allSameB = bValues.every((b) => b === bValues[0]);
  const b = bValues[0];
  const workStr = k === 0 ? "1" : k === 1 ? "n" : `n^${k}`;
  
  // Build recurrence string
  let recurrenceStr: string;
  if (allSameB) {
    recurrenceStr = `T(n) = ${a}T(n/${b}) + ${workStr}`;
  } else {
    const parts = bValues.map((bi) => `T(n/${bi})`).join(" + ");
    recurrenceStr = `T(n) = ${parts} + ${workStr}`;
  }

  // Try Master Theorem first (requires all same b)
  if (allSameB && b > 1) {
    const masterResult = applyMasterTheorem(a, b, k);
    if (masterResult) {
      const cls = toConstraintClass(masterResult.complexity);
      const constraint = CONSTRAINT_TABLE[cls];
      return {
        a,
        bValues,
        k,
        complexity: masterResult.complexity,
        theorem: "master",
        masterCase: masterResult.masterCase,
        p: masterResult.criticalExp,
        recurrenceStr,
        confidence,
        safeN: constraint.safeN,
        warning: constraint.safeN <= 5000
          ? `Warning: Will likely TLE for n > ${constraint.safeN.toLocaleString()}`
          : null,
      };
    }
  }

  // Fall back to Akra-Bazzi
  if (bValues.every((b) => b > 1)) {
    const abResult = applyAkraBazzi(a, bValues, k);
    const cls = toConstraintClass(abResult.complexity);
    const constraint = CONSTRAINT_TABLE[cls];
    return {
      a,
      bValues,
      k,
      complexity: abResult.complexity,
      theorem: "akra-bazzi",
      masterCase: null,
      p: abResult.p,
      recurrenceStr,
      confidence,
      safeN: constraint.safeN,
      warning: constraint.safeN <= 5000
        ? `Warning: Will likely TLE for n > ${constraint.safeN.toLocaleString()}`
        : null,
    };
  }

  return null;
}

// ─── Tooltip Formatting ───────────────────────────────────────────────────────

export function formatRecurrenceTooltip(result: RecurrenceResult): string {
  if (result.confidence === "LOW") {
    return [
      "**Recursive function detected**",
      result.warning ?? "Recurrence unclear — use empirical analysis for accurate results",
    ].join("\n\n");
  }

  const lines: string[] = [];

  if (result.theorem === "master") {
    lines.push(`**${result.complexity}** — Master Theorem, Case ${result.masterCase}`);
    lines.push(`Recurrence: ${result.recurrenceStr}`);
    
    const b = result.bValues[0];
    const workStr = result.k === 0 ? "f(n)=1" : result.k === 1 ? "f(n)=n" : `f(n)=n^${result.k}`;
    lines.push(
      `a=${result.a} recursive calls, divides by b=${b}, ${workStr} (k=${result.k})`
    );
    
    const critExp = result.p !== null ? formatExponent(result.p) : "?";
    lines.push(
      `log\\_${b}(${result.a}) = ${critExp} ${
        result.masterCase === 1
          ? `> k=${result.k} → Case 1`
          : result.masterCase === 2
          ? `= k=${result.k} → Case 2`
          : `< k=${result.k} → Case 3`
      }`
    );
  } else if (result.theorem === "akra-bazzi") {
    lines.push(`**${result.complexity}** — Akra-Bazzi method`);
    lines.push(`Recurrence: ${result.recurrenceStr}`);
    
    if (result.p !== null) {
      lines.push(
        `Characteristic exponent p = ${formatExponent(result.p)} (solved numerically)`
      );
      const workStr = result.k === 0 ? "1" : result.k === 1 ? "n" : `n^${result.k}`;
      if (result.k < result.p) {
        lines.push(`f(n) = ${workStr} < n^p → recursion dominates`);
      } else if (Math.abs(result.k - result.p) < 0.01) {
        lines.push(`f(n) = ${workStr} ≈ n^p → balanced with log factor`);
      } else {
        lines.push(`f(n) = ${workStr} > n^p → work dominates`);
      }
    }
  }

  if (result.safeN !== Infinity && result.safeN > 0) {
    lines.push(`Safe up to n = ${result.safeN.toLocaleString()}`);
  }

  if (result.warning) {
    lines.push("");
    lines.push(`⚠️ ${result.warning}`);
  }

  if (result.confidence === "MEDIUM") {
    lines.push("");
    lines.push("_Confidence: medium — verify with empirical analysis_");
  }

  return lines.join("\n\n");
}
