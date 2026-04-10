// features/dashboard/SolveHeatmap.tsx — GitHub-style solve calendar heatmap.
//
// Pure CSS grid implementation — no external library required.
// Shows last 365 days with color intensity based on solve count.

interface CalendarDay {
  date: string;
  count: number;
}

interface Props {
  data: CalendarDay[];
}

/** Map a solve count to a CSS color intensity class. */
function getIntensity(count: number): string {
  if (count === 0) return "heatmap-0";
  if (count === 1) return "heatmap-1";
  if (count <= 3) return "heatmap-2";
  if (count <= 5) return "heatmap-3";
  return "heatmap-4";
}

/** Get 3-letter month labels for the heatmap header. */
function getMonthLabels(data: CalendarDay[]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;

  data.forEach((day, idx) => {
    const d = new Date(day.date);
    const month = d.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const col = Math.floor(idx / 7);
      labels.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        col,
      });
    }
  });

  return labels;
}

export default function SolveHeatmap({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="heatmap-empty">
        <span>No solve data available</span>
      </div>
    );
  }

  const totalSolved = data.reduce((sum, d) => sum + d.count, 0);
  const monthLabels = getMonthLabels(data);
  const weeks = Math.ceil(data.length / 7);

  // Day labels (Mon, Wed, Fri)
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header">
        <span className="heatmap-total">
          {totalSolved} solves in the last year
        </span>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap-grid-wrapper">
          {/* Day labels column */}
          <div className="heatmap-day-labels">
            {dayLabels.map((label, i) => (
              <span key={i} className="heatmap-day-label">
                {label}
              </span>
            ))}
          </div>

          <div className="heatmap-main">
            {/* Month labels row */}
            <div
              className="heatmap-month-labels"
              style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}
            >
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="heatmap-month-label"
                  style={{ gridColumn: m.col + 1 }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Heatmap cells grid */}
            <div
              className="heatmap-grid"
              style={{
                gridTemplateRows: "repeat(7, 11px)",
                gridTemplateColumns: `repeat(${weeks}, 11px)`,
              }}
            >
              {data.map((day, idx) => (
                <div
                  key={day.date}
                  className={`heatmap-cell ${getIntensity(day.count)}`}
                  title={`${day.date}: ${day.count} solve${day.count !== 1 ? "s" : ""}`}
                  style={{
                    gridRow: (idx % 7) + 1,
                    gridColumn: Math.floor(idx / 7) + 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Less</span>
        <div className="heatmap-cell heatmap-0" />
        <div className="heatmap-cell heatmap-1" />
        <div className="heatmap-cell heatmap-2" />
        <div className="heatmap-cell heatmap-3" />
        <div className="heatmap-cell heatmap-4" />
        <span className="heatmap-legend-label">More</span>
      </div>
    </div>
  );
}
