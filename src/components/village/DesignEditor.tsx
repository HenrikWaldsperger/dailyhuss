import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { lockedKinds, PAINTS, ROOF_STYLES, WINDOW_STYLES, type HouseDesign } from "@/lib/village";
import { useVillageActions, villageError } from "@/lib/village-queries";

interface Props {
  draft: HouseDesign;
  setDraft: (d: HouseDesign) => void;
  premium: Map<string, number>;
  unlocked: Set<string>;
  onRequestUnlock: (kind: string, label: string, apply: () => void) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}

export function DesignEditor({ draft, setDraft, premium, unlocked, onRequestUnlock, onSave, saving, dirty }: Props) {
  const actions = useVillageActions();
  const [name, setName] = useState("");

  function pick(kind: string, label: string, next: HouseDesign) {
    if (premium.has(kind) && !unlocked.has(kind)) {
      onRequestUnlock(kind, label, () => setDraft(next));
      return;
    }
    setDraft(next);
  }

  const locked = lockedKinds(draft, premium, unlocked);

  async function saveAsDesign() {
    const n = name.trim();
    if (!n) {
      toast.error("Gib deinem Design einen Namen.");
      return;
    }
    try {
      await actions.saveDesign.mutateAsync({ name: n, design: draft });
      setName("");
      toast.success(`Design „${n}“ gespeichert`);
    } catch (e) {
      toast.error(villageError(e));
    }
  }

  const paintRow = (label: string, field: "wall" | "roof" | "door") => (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {PAINTS.map((p) => {
          const kind = `paint:${p.key}`;
          const isLocked = premium.has(kind) && !unlocked.has(kind);
          const active = draft[field] === p.key;
          return (
            <button
              key={p.key}
              type="button"
              title={isLocked ? `${p.name} – ${premium.get(kind)} Taler` : p.name}
              aria-label={isLocked ? `${p.name}, gesperrt, ${premium.get(kind)} Taler` : p.name}
              aria-pressed={active}
              onClick={() => pick(kind, `Farbe „${p.name}“`, { ...draft, [field]: p.key })}
              className={cn(
                "relative h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                active ? "border-foreground ring-2 ring-accent ring-offset-2 ring-offset-card" : "border-border",
              )}
              style={{ background: `var(--paint-${p.key})` }}
            >
              {isLocked && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const chipRow = <T extends string>(
    label: string,
    prefix: string,
    options: readonly { key: T; name: string }[],
    current: T,
    apply: (v: T) => HouseDesign,
  ) => (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const kind = `${prefix}:${o.key}`;
          const isLocked = premium.has(kind) && !unlocked.has(kind);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={current === o.key}
              onClick={() => pick(kind, `„${o.name}“`, apply(o.key))}
              className={cn(
                "flex items-center gap-1 rounded-xl border px-2.5 py-1 text-sm font-medium transition-colors",
                current === o.key ? "border-foreground bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              {isLocked && <Lock className="h-3 w-3" />}
              {o.name}
              {isLocked && <span className="text-xs text-muted-foreground">🪙{premium.get(kind)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {paintRow("Wand", "wall")}
      {paintRow("Dach", "roof")}
      {paintRow("Tür", "door")}
      {chipRow("Dachform", "roof", ROOF_STYLES, draft.roofStyle, (v) => ({ ...draft, roofStyle: v }))}
      {chipRow("Fenster", "window", WINDOW_STYLES, draft.windows, (v) => ({ ...draft, windows: v }))}
      {locked.length > 0 && <p className="text-sm text-destructive">Dieses Design enthält noch gesperrte Teile – schalte sie erst frei.</p>}
      <Button className="w-full" onClick={onSave} disabled={!dirty || saving || locked.length > 0}>
        {saving ? "Speichert …" : "Design übernehmen"}
      </Button>
      <div className="rounded-2xl border border-dashed p-3">
        <p className="mb-2 text-sm font-semibold">Als eigenes Design speichern</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Sommerhaus" maxLength={40} />
          <Button variant="soft" onClick={saveAsDesign} disabled={actions.saveDesign.isPending}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
