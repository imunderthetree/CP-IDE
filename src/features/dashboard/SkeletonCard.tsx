// features/dashboard/SkeletonCard.tsx — Loading placeholder for platform cards.

interface Props {
  accentColor: string;
}

export default function SkeletonCard({ accentColor }: Props) {
  return (
    <div className="platform-card skeleton-card">
      <div className="card-header">
        <div
          className="card-platform-badge skeleton-badge"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          <div className="skeleton-line" style={{ width: 80, height: 14 }} />
        </div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-line" style={{ width: "60%", height: 20 }} />
        <div className="skeleton-row">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
        <div className="skeleton-line" style={{ width: "100%", height: 100 }} />
        <div className="skeleton-line" style={{ width: "80%", height: 12 }} />
        <div className="skeleton-line" style={{ width: "90%", height: 12 }} />
        <div className="skeleton-line" style={{ width: "70%", height: 12 }} />
      </div>
    </div>
  );
}
