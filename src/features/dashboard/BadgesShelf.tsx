// features/dashboard/BadgesShelf.tsx — Horizontal badge display shelf.

interface BadgeItem {
  name: string;
  icon?: string;
}

interface Props {
  badges: BadgeItem[];
}

export default function BadgesShelf({ badges }: Props) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="badges-shelf">
      {badges.map((badge, idx) => (
        <div key={idx} className="badge-item">
          {badge.icon && <span className="badge-icon">{badge.icon}</span>}
          <span className="badge-name">{badge.name}</span>
        </div>
      ))}
    </div>
  );
}
