import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { describeReward, earnedRewardKeys } from "@/lib/levels";
import { coinsForReward } from "@/lib/village";
import { rewardsQueryOptions, saveUnlocks, useProgress } from "@/lib/rewards-queries";

/** Hands out newly earned rewards (saved to the account) and celebrates them once. */
export function RewardSync() {
  const progress = useProgress();
  const rewards = useQuery(rewardsQueryOptions);
  const qc = useQueryClient();
  const [fresh, setFresh] = useState<string[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    if (!progress || !rewards.data || busy.current) return;
    const have = new Set(rewards.data.map((r) => r.reward_key));
    const missing = earnedRewardKeys(progress.stats).filter((k) => !have.has(k));
    if (missing.length === 0) return;
    busy.current = true;
    saveUnlocks(missing)
      .then((added) => {
        if (added.length > 0) setFresh((prev) => [...prev, ...added]);
        return Promise.all([qc.invalidateQueries({ queryKey: ["rewards"] }), qc.invalidateQueries({ queryKey: ["coins"] })]);
      })
      .catch((e) => console.error("Belohnungen konnten nicht gespeichert werden", e))
      .finally(() => {
        busy.current = false;
      });
  }, [progress, rewards.data, qc]);

  const items = fresh.map((k) => ({ key: k, info: describeReward(k) })).filter((x) => x.info);
  // Show the highest level only, then all badges.
  const levels = items.filter((x) => x.key.startsWith("level:"));
  const topLevel = levels[levels.length - 1];
  const shown = [...(topLevel ? [topLevel] : []), ...items.filter((x) => x.key.startsWith("badge:"))];
  const totalCoins = fresh.reduce((sum, k) => sum + coinsForReward(k), 0);

  return (
    <Dialog open={shown.length > 0} onOpenChange={(o) => !o && setFresh([])}>
      <DialogContent className="max-w-md rounded-3xl text-center">
        <DialogHeader className="items-center">
          <div className="animate-pop text-6xl" aria-hidden>
            {shown[0]?.info?.emoji ?? "🎉"}
          </div>
          <DialogTitle className="font-display text-3xl font-extrabold">
            {shown.length > 1 ? "Neue Belohnungen!" : "Neue Belohnung!"}
          </DialogTitle>
          <DialogDescription>
            Stark drangeblieben – das hast du dir verdient.
            {totalCoins > 0 && (
              <span className="mt-2 block font-display text-xl font-bold text-foreground">+{totalCoins} Taler 🪙</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 space-y-2 overflow-y-auto text-left">
          {shown.map(({ key, info }) => (
            <li key={key} className="flex items-center gap-3 rounded-2xl border bg-secondary/50 p-3">
              <span className="text-3xl">{info!.emoji}</span>
              <div>
                <p className="font-semibold">{info!.name}</p>
                <p className="text-sm text-muted-foreground">{info!.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" asChild onClick={() => setFresh([])}>
            <Link to="/dorf">Ins Dorf</Link>
          </Button>
          <Button variant="hero" onClick={() => setFresh([])}>
            Weiter geht's
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
