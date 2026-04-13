// features/dashboard/TagBreakdownChart.tsx — Horizontal bar chart for solved-by-tag.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface TagBucket {
  tag: string;
  count: number;
}

interface Props {
  data: TagBucket[];
}

// Palette of colors to cycle through for tags
const TAG_COLORS = [
  "#00e5a0", "#58a6ff", "#bc8cff", "#ff7b72",
  "#d29922", "#3fb950", "#f778ba", "#79c0ff",
  "#ffa657", "#7ee787", "#a5d6ff", "#ff9bce",
];

export default function TagBreakdownChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="tag-chart-empty">
        <span>No tag data available</span>
      </div>
    );
  }

  // Show top 10 tags
  const top = data.slice(0, 10);

  return (
    <div className="tag-chart-container">
      <ResponsiveContainer width="100%" height={Math.max(160, top.length * 24)}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: "#555d68", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="tag"
            tick={{ fill: "#8b949e", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: "#151a22",
              border: "1px solid #2a3240",
              borderRadius: 5,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#8b949e" }}
            formatter={(value) => [`${value} solved`, ""]}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
            {top.map((_, idx) => (
              <Cell key={idx} fill={TAG_COLORS[idx % TAG_COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
