import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Hammer, Move, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesignEditor } from "@/components/village/DesignEditor";
import { DecorationArt, House, VillageItemArt } from "@/components/village/VillageArt";
import { cn } from "@/lib/utils";
import {
  GRID_COLS,
  GRID_ROWS,
  ITEM_INFO,
  normalizeDesign,
  type CatalogRow,
  type HouseDesign,
} from "@/lib/village";
import {
  catalogQueryOptions,
  coinsQueryOptions,
  designUnlocksQueryOptions,
  savedDesignsQueryOptions,
  useVillageActions,
  villageError,
  villageItemsQueryOptions,
  type VillageItem,
} from "@/lib/village-queries";

export const Route = createFileRoute("/_authenticated/dorf")({
  head: () => ({
    meta: [
      { title: "Dein Dorf – DailyHuss" },
      { name: "description", content: "Bau dir mit deinen Talern ein eigenes Dorf, gestalte Häuser und dekoriere sie." },
      { property: "og:title", content: "Dein Dorf – DailyHuss" },
      { property: "og:description", content: "Bau dir mit deinen Talern ein eigenes Dorf, gestalte Häuser und dekoriere sie." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(coinsQueryOptions),
      context.queryClient.ensureQueryData(catalogQueryOptions),
      context.queryClient.ensureQueryData(villageItemsQueryOptions),
      context.queryClient.ensureQueryData(designUnlocksQueryOptions),
      context.queryClient.ensureQueryData(savedDesignsQueryOptions),
    ]),
  component: VillagePage,
});

type Selection = { type: "tile"; x: number; y: number } | { type: "item"; id: string } | null;

function VillagePage() {
  const { data: coins } = useSuspenseQuery(coinsQueryOptions);
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const { data: items } = useSuspenseQuery(villageItemsQueryOptions);
  const { data: unlockList } = useSuspenseQuery(designUnlocksQueryOptions);
  const actions = useVillageActions();
  const [sel, setSel] = useState<Selection>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [draft, setDraft] = useState<HouseDesign | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<{ kind: string; label: string; apply: () => void } | null>(null);

  const byKind = useMemo(() => new Map(catalog.map((c) => [c.kind, c])), [catalog]);
  const premium = useMemo(() => new Map(catalog.filter((c) => c.category === "design").map((c) => [c.kind, c.price])), [catalog]);
  const unlocked = useMemo(() => new Set(unlockList), [unlockList]);
  const at = (x: number, y: number) => items.find((i) => i.x === x && i.y === y);
  const selectedItem = sel?.type === "item" ? items.find((i) => i.id === sel.id) : undefined;
  const selectedCat = selectedItem ? byKind.get(selectedItem.kind) : undefined;

  useEffect(() => {
    setDraft(selectedItem && selectedCat?.category === "house" ? normalizeDesign(selectedItem.kind, selectedItem.design) : null);
    // reset the draft only when another item gets selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  async function clickTile(x: number, y: number) {
    const item = at(x, y);
    if (moving) {
      if (item) {
        toast.error("Dieser Platz ist belegt – wähle einen freien.");
        return;
      }
      try {
        await actions.move.mutateAsync({ item: moving, x, y });
        setSel({ type: "item", id: moving });
      } catch (e) {
        toast.error(villageError(e));
      }
      setMoving(null);
      return;
    }
    setSel(item ? { type: "item", id: item.id } : { type: "tile", x, y });
  }

  async function confirmUnlock() {
    if (!pendingUnlock) return;
    try {
      await actions.unlock.mutateAsync(pendingUnlock.kind);
      pendingUnlock.apply();
      toast.success(`${pendingUnlock.label} freigeschaltet`);
    } catch (e) {
      toast.error(villageError(e));
    }
    setPendingUnlock(null);
  }

  const houseCount = items.filter((i) => byKind.get(i.kind)?.category === "house").length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {houseCount} {houseCount === 1 ? "Haus" : "Häuser"} · {items.length} von {GRID_COLS * GRID_ROWS} Plätzen bebaut
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">
            Dein Dorf<span className="text-accent">.</span>
          </h1>
        </div>
        <div className="paper flex items-center gap-3 px-4 py-3">
          <span className="text-3xl" aria-hidden>🪙</span>
          <div>
            <p className="font-display text-2xl font-extrabold leading-none tabular">{coins}</p>
            <p className="text-xs text-muted-foreground">Taler · für Abzeichen & Level</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section
          className="relative overflow-hidden rounded-3xl border p-3 shadow-paper sm:p-4"
          style={{ background: "linear-gradient(180deg, var(--grass) 0%, var(--grass-dark) 100%)" }}
          aria-label="Dorfkarte"
        >
          {moving && (
            <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between rounded-2xl bg-card/95 px-3 py-2 text-sm shadow-paper">
              <span className="flex items-center gap-2 font-medium">
                <Move className="h-4 w-4" /> Wähle einen freien Platz
              </span>
              <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>
                Abbrechen
              </Button>
            </div>
          )}
          <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
              const x = i % GRID_COLS;
              const y = Math.floor(i / GRID_COLS);
              const item = at(x, y);
              const cat = item ? byKind.get(item.kind) : undefined;
              const isSel = (sel?.type === "tile" && sel.x === x && sel.y === y) || (sel?.type === "item" && item?.id === sel.id);
              const showDraft = item && draft && sel?.type === "item" && sel.id === item.id;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => clickTile(x, y)}
                  aria-label={item ? (ITEM_INFO[item.kind]?.name ?? item.kind) : `Freier Bauplatz ${x + 1}/${y + 1}`}
                  className={cn(
                    "group relative aspect-square rounded-2xl transition-all",
                    item ? "bg-transparent hover:bg-background/15" : "border-2 border-dashed border-background/50 bg-background/10 hover:bg-background/25",
                    isSel && "bg-background/30 ring-2 ring-accent",
                    moving && !item && "animate-pulse border-background",
                  )}
                >
                  {item && cat ? (
                    <VillageItemArt
                      kind={item.kind}
                      category={cat.category}
                      design={showDraft ? draft : item.design}
                      decorations={item.decorations}
                      className="h-full w-full drop-shadow-sm"
                    />
                  ) : (
                    <span className="text-xl text-background/70 opacity-0 transition-opacity group-hover:opacity-100">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="paper h-fit p-5 lg:sticky lg:top-24">
          {!sel && <Intro empty={items.length === 0} />}
          {sel?.type === "tile" && (
            <BuildShop
              catalog={catalog}
              coins={coins}
              onClose={() => setSel(null)}
              busy={actions.buy.isPending}
              onBuy={async (row) => {
                try {
                  const id = await actions.buy.mutateAsync({ kind: row.kind, x: sel.x, y: sel.y });
                  toast.success(`${ITEM_INFO[row.kind]?.name ?? row.kind} gebaut!`);
                  if (typeof id === "string") setSel({ type: "item", id });
                } catch (e) {
                  toast.error(villageError(e));
                }
              }}
            />
          )}
          {selectedItem && selectedCat && (
            <ItemPanel
              item={selectedItem}
              cat={selectedCat}
              catalog={catalog}
              coins={coins}
              draft={draft}
              setDraft={setDraft}
              premium={premium}
              unlocked={unlocked}
              onRequestUnlock={(kind, label, apply) => setPendingUnlock({ kind, label, apply })}
              onClose={() => setSel(null)}
              onMove={() => setMoving(selectedItem.id)}
            />
          )}
        </aside>
      </div>

      <AlertDialog open={!!pendingUnlock} onOpenChange={(o) => !o && setPendingUnlock(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingUnlock?.label} freischalten?</AlertDialogTitle>
            <AlertDialogDescription>
              Kostet {pendingUnlock ? premium.get(pendingUnlock.kind) : 0} Taler. Danach kannst du es für alle Häuser nutzen. Du hast {coins} Taler.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlock}
              disabled={!pendingUnlock || (premium.get(pendingUnlock.kind) ?? 0) > coins}
            >
              🪙 Freischalten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Intro({ empty }: { empty: boolean }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{empty ? "Willkommen im Dorf!" : "Dein Dorf wächst"}</h2>
      <p className="text-sm text-muted-foreground">
        {empty
          ? "Du startest mit 100 Talern. Tippe auf einen freien Bauplatz und bau dein erstes Haus."
          : "Tippe auf einen freien Platz zum Bauen oder auf ein Haus, um es zu gestalten und zu dekorieren."}
      </p>
      <div className="rounded-2xl bg-secondary/60 p-3 text-sm">
        <p className="mb-1 font-semibold">So verdienst du Taler</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>🏅 Abzeichen: 50 Taler (große: bis 150)</li>
          <li>⬆️ Neues Level: 20 + 10 × Level</li>
          <li>🏚️ Abreißen: die Hälfte zurück</li>
        </ul>
      </div>
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
        <X />
      </Button>
    </div>
  );
}

function ShopRow({ art, name, desc, price, coins, action, onClick, busy }: {
  art: React.ReactNode;
  name: string;
  desc?: string | undefined;
  price: number;
  coins: number;
  action: string;
  onClick: () => void;
  busy?: boolean;
}) {
  const affordable = coins >= price;
  return (
    <li className="flex items-center gap-3 rounded-2xl border p-2">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-secondary/60">{art}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{name}</p>
        {desc && <p className="truncate text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Button size="sm" variant={affordable ? "hero" : "outline"} disabled={!affordable || busy} onClick={onClick} className="shrink-0">
        {action} 🪙{price}
      </Button>
    </li>
  );
}

function BuildShop({ catalog, coins, onBuy, onClose, busy }: {
  catalog: CatalogRow[];
  coins: number;
  onBuy: (row: CatalogRow) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const groups: { key: string; label: string; cats: string[] }[] = [
    { key: "house", label: "Häuser", cats: ["house"] },
    { key: "other", label: "Gebäude & Natur", cats: ["building", "nature"] },
  ];
  return (
    <div>
      <PanelHeader title="Bauen" onClose={onClose} />
      <Tabs defaultValue="house">
        <TabsList className="mb-3 w-full">
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key} className="flex-1">
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {catalog
                .filter((c) => g.cats.includes(c.category))
                .map((c) => (
                  <ShopRow
                    key={c.kind}
                    art={<VillageItemArt kind={c.kind} category={c.category} className="h-full w-full" />}
                    name={ITEM_INFO[c.kind]?.name ?? c.kind}
                    desc={ITEM_INFO[c.kind]?.description}
                    price={c.price}
                    coins={coins}
                    action="Bauen"
                    busy={busy}
                    onClick={() => onBuy(c)}
                  />
                ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ItemPanel(props: {
  item: VillageItem;
  cat: CatalogRow;
  catalog: CatalogRow[];
  coins: number;
  draft: HouseDesign | null;
  setDraft: (d: HouseDesign) => void;
  premium: Map<string, number>;
  unlocked: Set<string>;
  onRequestUnlock: (kind: string, label: string, apply: () => void) => void;
  onClose: () => void;
  onMove: () => void;
}) {
  const { item, cat, catalog, coins, draft, setDraft, premium, unlocked, onRequestUnlock, onClose, onMove } = props;
  const actions = useVillageActions();
  const { data: saved } = useSuspenseQuery(savedDesignsQueryOptions);
  const [tab, setTab] = useState("design");
  const [confirmSell, setConfirmSell] = useState(false);
  const info = ITEM_INFO[item.kind];
  const refund = Math.floor(cat.price / 2);
  const isHouse = cat.category === "house";
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(normalizeDesign(item.kind, item.design));

  async function saveDesign() {
    if (!draft) return;
    try {
      await actions.paint.mutateAsync({ item: item.id, design: draft });
      toast.success("Design übernommen");
    } catch (e) {
      toast.error(villageError(e));
    }
  }

  async function sell() {
    try {
      const r = await actions.sell.mutateAsync(item.id);
      toast.success(`Abgerissen – ${typeof r === "number" ? r : refund} Taler zurück`);
      onClose();
    } catch (e) {
      toast.error(villageError(e));
    }
  }

  return (
    <div>
      <PanelHeader title={info?.name ?? item.kind} onClose={onClose} />
      {!isHouse && <p className="mb-4 text-sm text-muted-foreground">{info?.description}</p>}
      {isHouse && draft && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="design" className="flex-1">Gestalten</TabsTrigger>
            <TabsTrigger value="deco" className="flex-1">Deko</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">Designs</TabsTrigger>
          </TabsList>
          <TabsContent value="design">
            <DesignEditor
              draft={draft}
              setDraft={setDraft}
              premium={premium}
              unlocked={unlocked}
              onRequestUnlock={onRequestUnlock}
              onSave={saveDesign}
              saving={actions.paint.isPending}
              dirty={dirty}
            />
          </TabsContent>
          <TabsContent value="deco">
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {catalog
                .filter((c) => c.category === "decoration")
                .map((c) => {
                  const owned = item.decorations.includes(c.kind);
                  return owned ? (
                    <li key={c.kind} className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success/5 p-2">
                      <div className="h-14 w-14 shrink-0 rounded-xl bg-secondary/60">
                        <DecorationArt kind={c.kind} className="h-full w-full" />
                      </div>
                      <p className="flex-1 font-semibold">{ITEM_INFO[c.kind]?.name}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actions.removeDecoration.isPending}
                        onClick={() =>
                          actions.removeDecoration
                            .mutateAsync({ item: item.id, decoration: c.kind })
                            .catch((e) => toast.error(villageError(e)))
                        }
                      >
                        Entfernen
                      </Button>
                    </li>
                  ) : (
                    <ShopRow
                      key={c.kind}
                      art={<DecorationArt kind={c.kind} className="h-full w-full" />}
                      name={ITEM_INFO[c.kind]?.name ?? c.kind}
                      desc={ITEM_INFO[c.kind]?.description}
                      price={c.price}
                      coins={coins}
                      action="Kaufen"
                      busy={actions.decorate.isPending}
                      onClick={() =>
                        actions.decorate
                          .mutateAsync({ item: item.id, decoration: c.kind })
                          .then(() => toast.success(`${ITEM_INFO[c.kind]?.name} angebracht`))
                          .catch((e) => toast.error(villageError(e)))
                      }
                    />
                  );
                })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Entfernte Deko gibt keine Taler zurück.</p>
          </TabsContent>
          <TabsContent value="saved">
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine eigenen Designs. Gestalte ein Haus und speichere es unter „Gestalten“ als eigenes Design.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {saved.map((s) => (
                  <li key={s.id} className="rounded-2xl border p-2 text-center">
                    <svg viewBox="0 0 100 100" className="mx-auto h-20 w-20" aria-hidden>
                      <House kind={item.kind} design={s.design} />
                    </svg>
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <div className="mt-1 flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => {
                          setDraft(normalizeDesign(item.kind, s.design));
                          setTab("design");
                        }}
                      >
                        Anwenden
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Design ${s.name} löschen`}
                        onClick={() => actions.deleteDesign.mutateAsync(s.id).catch((e) => toast.error(villageError(e)))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
      <div className="mt-5 flex gap-2 border-t border-dashed pt-4">
        <Button variant="outline" className="flex-1" onClick={onMove}>
          <Move /> Verschieben
        </Button>
        <Button variant="ghost" className="flex-1 text-destructive hover:text-destructive" onClick={() => setConfirmSell(true)}>
          <Hammer /> Abreißen
        </Button>
      </div>
      <AlertDialog open={confirmSell} onOpenChange={setConfirmSell}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{info?.name} abreißen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du bekommst {refund} Taler zurück.{isHouse && item.decorations.length > 0 ? " Die Deko geht dabei verloren." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={sell} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Abreißen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
