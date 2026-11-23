import { Link } from "@tanstack/react-router";
import { useProgress } from "@/lib/rewards-queries";

export function LevelPill() {
  const progress = useProgress();
  if (!progress) return null;
  const { level } = progress;
  return (
    <Link
      to="/erfolge"
      className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm shadow-paper transition-colors hover:bg-secondary"
      aria-label={`Level ${level.level}, ${level.title.name}`}
    >
      <span aria-hidden>{level.title.emoji}</span>
      <span className="font-semibold tabular">Lvl {level.level}</span>
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(level.ratio * 100)}%` }} />
      </span>
    </Link>
  );
}
