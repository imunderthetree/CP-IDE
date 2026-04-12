// features/complexity/ComplexityChart.tsx — Live Recharts LineChart for empirical analysis.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import type { ComplexityDataPoint } from "../../lib/tauriClient";

interface ComplexityChartProps {
  points: ComplexityDataPoint[];
  isRunning: boolean;
}

export default function ComplexityChart({ points, isRunning }: ComplexityChartProps) {
  if (points.length === 0) {
    return (
      <div className="cx-chart-empty">
        {isRunning ? (
          <>
            <div className="spinner" />
            <span>Collecting data points…</span>
          </>
        ) : (
          <span>Click Run to start empirical analysis</span>
        )}
      </div>
    );
  }

  const data = points.map((p) => ({
    n: p.n,
    time: Math.round(p.time_ms * 100) / 100,
    label: formatN(p.n),
  }));

  return (
    <div className="cx-chart-container">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#555d68" }}
            stroke="#2a3240"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#555d68" }}
            stroke="#2a3240"
            tickFormatter={(v: number) => `${v}ms`}
          />
          <RechartsTooltip
            contentStyle={{
              background: "#151a22",
              border: "1px solid #2a3240",
              borderRadius: 4,
              fontSize: 11,
              color: "#e6edf3",
            }}
            formatter={(value) => [`${value} ms`, "Time"]}
            labelFormatter={(label) => `n = ${label}`}
          />
          <Line
            type="monotone"
            dataKey="time"
            stroke="#00e5a0"
            strokeWidth={2}
            dot={<CustomDot />}
            animationDuration={300}
            activeDot={{ r: 4, fill: "#00e5a0", stroke: "#0a0e14", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom dot that pulses for the latest point
function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, index, payload } = props as {
    cx: number;
    cy: number;
    index: number;
    payload: { n: number };
  };
  if (cx === undefined || cy === undefined) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3}
      fill="#00e5a0"
      stroke="#0a0e14"
      strokeWidth={1}
      key={`dot-${index}-${payload?.n}`}
    />
  );
}

function formatN(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}k`;
  return String(n);
}
