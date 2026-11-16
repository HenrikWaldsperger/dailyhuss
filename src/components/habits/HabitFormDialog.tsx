import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HABIT_COLORS, HABIT_TEMPLATES, type Habit, type HabitDirection, type HabitPeriod } from "@/lib/habits";
import { useSaveHabit, type HabitInput } from "@/lib/habits-queries";

const EMOJIS = ["💧", "📱", "📚", "🚶", "🧘", "📖", "🗣️", "🏃", "🥗", "😴", "🎸", "✍️", "💪", "🚭", "☕", "🌱", "💰", "🎯"];

const schema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen ein").max(60, "Maximal 60 Zeichen"),
  emoji: z.string().min(1).max(16),
  color: z.enum(HABIT_COLORS),
  unit: z.string().trim().min(1, "Bitte gib eine Einheit an").max(20, "Maximal 20 Zeichen"),
  target: z.number({ invalid_type_error: "Bitte eine Zahl" }).positive("Muss größer als 0 sein").max(1_000_000),
  step: z.number({ invalid_type_error: "Bitte eine Zahl" }).positive("Muss größer als 0 sein").max(1_000_000),
  direction: z.enum(["at_least", "at_most"]),
  period: z.enum(["daily", "total"]),
  deadline: z.string().nullable(),
});

type FieldErrors = Partial<Record<"name" | "unit" | "target" | "step" | "emoji" | "color" | "direction" | "period" | "deadline", string>>;

type FormState = Omit<HabitInput, "target" | "step"> & { target: string; step: string };

const empty: FormState = {
  name: "",
  emoji: "✨",
  color: "lagoon",
  unit: "",
  target: "",
  step: "1",
  direction: "at_least",
  period: "daily",
  deadline: null,
};

function fromHabit(h: Habit): FormState {
  return {
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    unit: h.unit,
    target: String(h.target),
    step: String(h.step),
    direction: h.direction,
    period: h.period,
    deadline: h.deadline,
  };
}

interface Props {
  habit?: Habit;
  trigger: ReactNode;
  onSaved?: (id: string) => void;
}

export function HabitFormDialog({ habit, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(habit ? fromHabit(habit) : empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useSaveHabit();

  useEffect(() => {
    if (open) {
      setForm(habit ? fromHabit(habit) : empty);
      setErrors({});
    }
  }, [open, habit]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      target: form.target === "" ? NaN : Number(form.target.replace(",", ".")),
      step: form.step === "" ? NaN : Number(form.step.replace(",", ".")),
      deadline: form.period === "total" && form.deadline ? form.deadline : null,
      direction: form.period === "total" ? "at_least" : form.direction,
    });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof FieldErrors;
        errs[key] ??= issue.message;
      }
      setErrors(errs);
      return;
    }
    try {
      const id = await save.mutateAsync({ id: habit?.id, input: parsed.data });
      toast.success(habit ? "Gespeichert" : `${parsed.data.emoji} ${parsed.data.name} angelegt`);
      setOpen(false);
      onSaved?.(id);
    } catch {
      toast.error("Speichern hat nicht geklappt. Bitte versuch es nochmal.");
    }
  }

  const isTotal = form.period === "total";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{habit ? "Bearbeiten" : "Neue Gewohnheit"}</DialogTitle>
          <DialogDescription>
            {habit ? "Passe Ziel, Einheit oder Aussehen an." : "Starte mit einer Vorlage oder leg selbst los."}
          </DialogDescription>
        </DialogHeader>

        {!habit && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {HABIT_TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                data-habit={t.color}
                onClick={() =>
                  setForm({ ...t, target: String(t.target), step: String(t.step), deadline: null })
                }
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-habit/30 bg-habit/10 px-3 py-1.5 text-sm transition-colors hover:bg-habit/20"
              >
                <span>{t.emoji}</span>
                <span className="whitespace-nowrap">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            {(["daily", "total"] as HabitPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("period", p)}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  form.period === p ? "bg-card shadow-paper" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p === "daily" ? "Tägliche Gewohnheit" : "Langfristiges Ziel"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} maxLength={60} onChange={(e) => set("name", e.target.value)} placeholder="z. B. Wasser trinken" />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Symbol</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => set("emoji", em)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-colors",
                    form.emoji === em ? "bg-primary/15 ring-2 ring-primary" : "bg-muted hover:bg-secondary",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-habit={c}
                  aria-label={c}
                  onClick={() => set("color", c)}
                  className={cn(
                    "h-8 w-8 rounded-full bg-habit transition-transform",
                    form.color === c ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-105",
                  )}
                />
              ))}
            </div>
          </div>

          {!isTotal && (
            <div className="space-y-2">
              <Label>Ziel ist …</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["at_least", "at_most"] as HabitDirection[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("direction", d)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      form.direction === d ? "border-primary bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <div className="font-semibold">{d === "at_least" ? "Mindestens" : "Höchstens"}</div>
                    <div className="text-xs text-muted-foreground">
                      {d === "at_least" ? "z. B. 8 Gläser Wasser" : "z. B. max. 60 Min Social Media"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">{isTotal ? "Gesamtziel" : "Pro Tag"}</Label>
              <Input id="target" inputMode="decimal" value={form.target} onChange={(e) => set("target", e.target.value)} placeholder="8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Einheit</Label>
              <Input id="unit" value={form.unit} maxLength={20} onChange={(e) => set("unit", e.target.value)} placeholder="Gläser" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step">Schritt</Label>
              <Input id="step" inputMode="decimal" value={form.step} onChange={(e) => set("step", e.target.value)} placeholder="1" />
            </div>
          </div>
          {(errors.target || errors.unit || errors.step) && (
            <p className="-mt-3 text-sm text-destructive">{errors.target || errors.unit || errors.step}</p>
          )}
          <p className="-mt-3 text-xs text-muted-foreground">„Schritt“ ist, wie viel ein Tipp auf + hinzufügt.</p>

          {isTotal && (
            <div className="space-y-2">
              <Label htmlFor="deadline">Bis wann? (optional)</Label>
              <Input id="deadline" type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} />
            </div>
          )}

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={save.isPending}>
            {save.isPending ? "Speichere …" : habit ? "Speichern" : "Anlegen"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
