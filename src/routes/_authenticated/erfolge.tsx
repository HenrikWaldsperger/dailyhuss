import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Lock } from "lucide-react";
import { entriesQueryOptions, habitsQueryOptions } from "@/lib/habits-queries";
import {
  BADGES,
  LEVEL_TITLES,
  XP_GOAL_COMPLETED,
  XP_PER_MET_DAY,
  XP_PER_WEEK_STREAK,
} from "@/lib/levels";
import { rewardsQueryOptions, useProgress } from "@/lib/rewards-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/erfolge")({
  head: () => ({
    meta: [
      { title: "Erfolge & Level – DailyHuss" },
      { name: "description", content: "Dein Level, deine Titel und alle Abzeichen, die du freigeschaltet hast." },
      { property: "og:title", content: "Erfolge & Level – DailyHuss" },
      { property: "og:description", content: "Dein Level, deine Titel und alle Abzeichen, die du freigeschaltet hast." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(habitsQueryOptions),
      context.queryClient.ensureQueryData(entriesQueryOptions),
      context.queryClient.ensureQueryData(rewardsQueryOptions),
    ]),
  component: AchievementsPage,
});

function AchievementsPage() {
  const progress = useProgress();
  const { data: unlocks } = useSuspenseQuery(rewardsQueryOptions);
  if (!progress) return null;
  const { stats, level } = progress;
  const unlockedAt = new Map(unlocks.map((u) => [u.reward_key, u.unlocked_at]));
  const earnedCount = BADGES.filter((b) => unlockedAt.has(`badge:${b.key}`)).length;

  return (
    <div className="space-y-10">
      <section className="paper relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lift">
            <span className="text-xs font-semibold uppercase tracking-widest">Level</span>
            <span className="font-display text-5xl font-extrabold leading-none tabular">{level.level}</span>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Dein Titel</p>
              <h1 className="text-4xl font-extrabold">
                {level.title.emoji} {level.title.name}
              </h1>
            </div>
            <div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.round(level.ratio * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground tabular">
                {level.intoLevel} / {level.levelSpan} XP bis Level {level.level + 1} · insgesamt {level.xp} XP
                {level.nextTitle && ` · nächster Titel „${level.nextTitle.name}“ ab Level ${level.nextTitle.minLevel}`}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Erfüllte Tage" value={stats.metDays} />
          <MiniStat label="Beste Serie" value={stats.bestStreak} />
          <MiniStat label="Perfekte Tage" value={stats.perfectDays} />
          <MiniStat label="Ziele erreicht" value={stats.goalsCompleted} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Abzeichen</h2>
          <span className="text-sm text-muted-foreground tabular">
            {earnedCount} von {BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const at = unlockedAt.get(`badge:${b.key}`);
            return (
              <div key={b.key} className={cn("paper flex flex-col items-center gap-1 p-4 text-center", !at && "opacity-60")}>
                <span className={cn("text-4xl", !at && "grayscale")}>{b.emoji}</span>
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                  {at ? (
                    <span className="text-success">Freigeschaltet am {format(new Date(at), "d. MMM yyyy", { locale: de })}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" /> Noch gesperrt
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="paper p-5">
          <h2 className="mb-3 text-lg font-bold">Titel</h2>
          <ul className="space-y-2">
            {LEVEL_TITLES.map((t) => (
              <li key={t.name} className={cn("flex items-center justify-between rounded-xl px-3 py-2", level.level >= t.minLevel ? "bg-secondary" : "text-muted-foreground")}>
                <span>
                  {t.emoji} {t.name}
                </span>
                <span className="text-sm tabular">ab Level {t.minLevel}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="paper p-5">
          <h2 className="mb-3 text-lg font-bold">So sammelst du XP</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Tagesziel erfüllt</span><span className="font-semibold">+{XP_PER_MET_DAY} XP</span></li>
            <li className="flex justify-between"><span>Jede volle Woche am Stück</span><span className="font-semibold">+{XP_PER_WEEK_STREAK} XP</span></li>
            <li className="flex justify-between"><span>Langfristiges Ziel: je 1 % Fortschritt</span><span className="font-semibold">+1 XP</span></li>
            <li className="flex justify-between"><span>Langfristiges Ziel abgeschlossen</span><span className="font-semibold">+{XP_GOAL_COMPLETED} XP</span></li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Bei „höchstens“-Gewohnheiten zählt ein vergangener Tag ohne Eintrag als geschafft.</p>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold tabular">{value}</p>
    </div>
  );
}
