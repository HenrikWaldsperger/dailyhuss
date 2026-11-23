import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import coachAvatar from "@/assets/coach-tung.webp";
import { GENERAL_TOPIC, tipOfTheDay, topicForHabit } from "@/lib/coach-tips";
import type { Habit } from "@/lib/habits";
import { useProgress } from "@/lib/rewards-queries";

/** Level progress + coach tip of the day, shown on the daily overview. */
export function TodayBoost({ habits, today }: { habits: Habit[]; today: Date }) {
  const progress = useProgress();
  const dayNumber = Math.floor(today.getTime() / 86_400_000);
  const habit = habits.length > 0 ? habits[dayNumber % habits.length] : undefined;
  const topic = habit ? topicForHabit(habit) : GENERAL_TOPIC;
  const tip = tipOfTheDay(topic, today);

  return (
    <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      {progress && (
        <Link to="/erfolge" className="paper group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-accent text-accent-foreground">
            <span className="text-[10px] font-semibold uppercase leading-none tracking-widest">Lvl</span>
            <span className="font-display text-2xl font-extrabold leading-none tabular">{progress.level.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {progress.level.title.emoji} {progress.level.title.name}
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress.level.ratio * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular">
              Noch {progress.level.levelSpan - progress.level.intoLevel} XP bis Level {progress.level.level + 1}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <Link to="/coach" search={{ frage: topic.question }} className="paper group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
        <img src={coachAvatar} alt="Coach Tung Tung Tung Sahur" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipp des Tages{habit ? ` · ${habit.emoji} ${habit.name}` : ""}
          </p>
          <p className="mt-0.5 text-sm">{tip}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
