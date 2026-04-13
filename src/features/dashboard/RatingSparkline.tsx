// features/dashboard/RatingSparkline.tsx — Recharts line chart for CF rating history.

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getCfTier } from "../../lib/platformApi";

interface RatingPoint {
  date: string;
  rating: number;
}

interface Props {
  data: RatingPoint[];
  currentRating: number | null;
}

export default function RatingSparkline({ data, currentRating }: Props) {
  if (data.length === 0) {
    return (
      <div className="sparkline-empty">
        <span>No rating history available</span>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));

  const ratings = data.map((d) => d.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const padding = Math.max(50, (maxR - minR) * 0.1);

  const tierColor = getCfTier(currentRating).color;

  return (
    <div className="sparkline-container">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="ratingGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#555d68" />
              <stop offset="100%" stopColor={tierColor} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: "#555d68", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minR - padding, maxR + padding]}
            tick={{ fill: "#555d68", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
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
            itemStyle={{ color: tierColor }}
            formatter={(value) => [value, "Rating"]}
          />
          {/* Tier boundary lines */}
          {[1200, 1400, 1600, 1900, 2100].map((boundary) =>
            boundary >= minR - padding && boundary <= maxR + padding ? (
              <ReferenceLine
                key={boundary}
                y={boundary}
                stroke="#2a3240"
                strokeDasharray="3 3"
              />
            ) : null
          )}
          <Line
            type="monotone"
            dataKey="rating"
            stroke="url(#ratingGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: tierColor, stroke: "#0f1319", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
