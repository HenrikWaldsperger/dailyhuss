import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import coachAvatar from "@/assets/coach-tung.webp";
import { Button } from "@/components/ui/button";
import { topicForHabit } from "@/lib/coach-tips";
import type { Habit } from "@/lib/habits";

export function CoachTipsCard({ habit }: { habit: Pick<Habit, "name" | "unit"> }) {
  const topic = topicForHabit(habit);
  return (
    <section className="paper overflow-hidden">
      <div className="flex items-center gap-3 border-b border-dashed p-5">
        <img src={coachAvatar} alt="Coach Tung Tung Tung Sahur" width={48} height={48} className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <h2 className="text-lg font-bold">Tipps von Tung Tung Tung Sahur</h2>
          <p className="text-sm text-muted-foreground">{topic.title}</p>
        </div>
        <Button variant="soft" size="sm" asChild>
          <Link to="/coach" search={{ frage: topic.question }}>
            <MessageCircle /> Frag Tung
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-2">
        <ul className="space-y-2.5">
          {topic.tips.map((t) => (
            <li key={t} className="flex gap-2 text-sm">
              <span className="text-accent" aria-hidden>●</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        {topic.exercises && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Übungen</h3>
            <ul className="space-y-2">
              {topic.exercises.map((e) => (
                <li key={e.name} className="rounded-2xl border bg-secondary/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-sm font-semibold text-habit tabular">{e.amount}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{e.how}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
