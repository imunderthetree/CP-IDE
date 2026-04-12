// lib/complexity_fit.ts — Layer 3: Empirical curve fitting.
//
// After data points arrive from the complexity runner, fits the runtime
// data to known complexity classes using R² (coefficient of determination).
// The best-fitting class with the highest R² wins.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataPoint {
  n: number;
  time_ms: number;
}

export type FitComplexityClass =
  | "O(1)"
  | "O(log n)"
  | "O(n)"
  | "O(n log n)"
  | "O(n sqrt n)"
  | "O(n^2)"
  | "O(n^3)";

export interface FitResult {
  best: FitComplexityClass;
  r2: number;
  inconclusive: boolean;
  allFits: Array<{ cls: FitComplexityClass; r2: number }>;
}

// ─── Candidate Complexity Functions ───────────────────────────────────────────

const candidates: Record<FitComplexityClass, (n: number) => number> = {
  "O(1)":        (_n: number) => 1,
  "O(log n)":    (n: number) => Math.log2(Math.max(n, 1)),
  "O(n)":        (n: number) => n,
  "O(n log n)":  (n: number) => n * Math.log2(Math.max(n, 1)),
  "O(n sqrt n)": (n: number) => n * Math.sqrt(n),
  "O(n^2)":      (n: number) => n * n,
  "O(n^3)":      (n: number) => n * n * n,
};

// ─── R² Calculation ───────────────────────────────────────────────────────────

/**
 * Compute R² (coefficient of determination) for a candidate model.
 *
 * The model is: time = k * f(n), where k is a scaling constant
 * estimated via least-squares: k = Σ(t_i * f(n_i)) / Σ(f(n_i)²)
 *
 * R² = 1 - SS_res / SS_tot
 * Perfect fit → R² = 1, random noise → R² ≈ 0
 */
function computeR2(
  points: DataPoint[],
  f: (n: number) => number
): number {
  const ts = points.map((p) => p.time_ms);
  const fs = points.map((p) => f(p.n));

  // Compute optimal scaling constant k via least squares
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < points.length; i++) {
    numerator += ts[i] * fs[i];
    denominator += fs[i] * fs[i];
  }

  if (denominator === 0) return -Infinity;
  const k = numerator / denominator;
  if (k <= 0) return -Infinity; // Negative scaling makes no sense for runtime

  // Compute SS_res and SS_tot
  const mean = ts.reduce((a, b) => a + b, 0) / ts.length;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < points.length; i++) {
    const predicted = k * fs[i];
    ssRes += (ts[i] - predicted) ** 2;
    ssTot += (ts[i] - mean) ** 2;
  }

  if (ssTot === 0) return 1; // All points identical — any model "fits"
  return 1 - ssRes / ssTot;
}

// ─── Main Fit Function ────────────────────────────────────────────────────────

/**
 * Fit data points to known complexity classes and return the best fit.
 *
 * Requires at least 4 data points for meaningful fitting.
 * If the best R² is below 0.95, the result is marked as inconclusive.
 */
export function fitComplexity(points: DataPoint[]): FitResult {
  if (points.length < 3) {
    return {
      best: "O(n)",
      r2: 0,
      inconclusive: true,
      allFits: [],
    };
  }

  // Filter out points with zero time (can happen for very small n)
  const validPoints = points.filter((p) => p.time_ms > 0 && p.n > 0);
  if (validPoints.length < 3) {
    return {
      best: "O(n)",
      r2: 0,
      inconclusive: true,
      allFits: [],
    };
  }

  const allFits: Array<{ cls: FitComplexityClass; r2: number }> = [];
  let bestClass: FitComplexityClass = "O(n)";
  let bestR2 = -Infinity;

  for (const [cls, fn] of Object.entries(candidates) as Array<
    [FitComplexityClass, (n: number) => number]
  >) {
    const r2 = computeR2(validPoints, fn);
    allFits.push({ cls, r2 });

    if (r2 > bestR2) {
      bestR2 = r2;
      bestClass = cls;
    }
  }

  // Sort fits by R² descending for display
  allFits.sort((a, b) => b.r2 - a.r2);

  return {
    best: bestClass,
    r2: bestR2,
    inconclusive: bestR2 < 0.95,
    allFits,
  };
}

// ─── Safe N Lookup ────────────────────────────────────────────────────────────

/** Constraint table for the fitted complexity class. */
export const FIT_CONSTRAINT_TABLE: Record<FitComplexityClass, number> = {
  "O(1)":        Infinity,
  "O(log n)":    Infinity,
  "O(n)":        1e8,
  "O(n log n)":  1e7,
  "O(n sqrt n)": 1e5,
  "O(n^2)":      5000,
  "O(n^3)":      500,
};

/**
 * Get the safe n for a fitted complexity class.
 */
export function getSafeN(cls: FitComplexityClass): number {
  return FIT_CONSTRAINT_TABLE[cls] ?? 5000;
}
