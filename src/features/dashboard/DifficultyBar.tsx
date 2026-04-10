// features/dashboard/DifficultyBar.tsx — Stacked horizontal bar for difficulty breakdown.

interface DifficultyEntry {
  label: string;
  count: number;
}

interface Props {
  data: DifficultyEntry[];
  accentColor: string;
}

// Predefined colors for common difficulty labels
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#4dbb8a",
  Medium: "#d4a843",
  Hard: "#e05f5f",
  "< 1200": "#4dbb8a",
  "1200-1599": "#03a89e",
  "1600-1999": "#5b9cf6",
  "2000-2399": "#aa00aa",
  "2400+": "#ff0000",
  Unrated: "#6b7094",
};

export default function DifficultyBar({ data, accentColor }: Props) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  return (
    <div className="difficulty-bar-container">
      <div className="difficulty-bar">
        {data.map((d, i) => {
          const pct = (d.count / total) * 100;
          if (pct === 0) return null;
          const color = DIFFICULTY_COLORS[d.label] || accentColor;
          return (
            <div
              key={i}
              className="difficulty-segment"
              style={{ width: `${pct}%`, background: color }}
              title={`${d.label}: ${d.count}`}
            />
          );
        })}
      </div>
      <div className="difficulty-legend">
        {data.map((d, i) => {
          const color = DIFFICULTY_COLORS[d.label] || accentColor;
          return (
            <div key={i} className="difficulty-legend-item">
              <span className="difficulty-dot" style={{ background: color }} />
              <span className="difficulty-label">{d.label}</span>
              <span className="difficulty-count">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
