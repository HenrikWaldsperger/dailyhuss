/** Village: currency rules, item info and house design options. Prices live in the database catalog. */

export const START_COINS = 100;
export const GRID_COLS = 6;
export const GRID_ROWS = 4;

/** Taler per reward. Must match public.coin_value() in the database. */
export function coinsForReward(key: string): number {
  const level = /^level:(\d{1,3})$/.exec(key);
  if (level) return 20 + 10 * Number(level[1]);
  if (["badge:streak_30", "badge:days_200", "badge:perfect_10", "badge:level_20"].includes(key)) return 150;
  if (key === "badge:level_10") return 100;
  if (key.startsWith("badge:")) return 50;
  return 0;
}

export type Category = "house" | "building" | "nature" | "decoration" | "design";

export interface CatalogRow {
  kind: string;
  category: Category;
  price: number;
  sort: number;
}

export const ITEM_INFO: Record<string, { name: string; description: string }> = {
  hut: { name: "Hütte", description: "Klein, gemütlich, ein guter Anfang." },
  cottage: { name: "Häuschen", description: "Ein richtiges Zuhause mit Garten-Feeling." },
  tower: { name: "Turmhaus", description: "Schmal, hoch und mit Aussicht." },
  villa: { name: "Villa", description: "Zwei Stockwerke voller Stolz." },
  well: { name: "Brunnen", description: "Treffpunkt im Dorfzentrum." },
  windmill: { name: "Windmühle", description: "Dreht sich im Wind – das Wahrzeichen deines Dorfes." },
  bush: { name: "Busch", description: "Ein bisschen Grün." },
  flowerbed: { name: "Blumenbeet", description: "Bunte Blüten für die Wege." },
  tree: { name: "Laubbaum", description: "Spendet Schatten." },
  pine: { name: "Tanne", description: "Immergrün." },
  bench: { name: "Bank", description: "Zum Ausruhen nach dem Training." },
  streetlamp: { name: "Straßenlaterne", description: "Licht für abends." },
  pond: { name: "Teich", description: "Mit Seerose." },
  flowerbox: { name: "Blumenkasten", description: "Blüten unter dem Fenster." },
  flag: { name: "Fahne", description: "Weht stolz auf dem Dach." },
  mailbox: { name: "Briefkasten", description: "Für Post vom Coach." },
  fence: { name: "Gartenzaun", description: "Ein weißer Lattenzaun." },
  lantern: { name: "Türlaterne", description: "Warmes Licht am Eingang." },
  chimney: { name: "Schornstein", description: "Mit gemütlichem Rauch." },
  garland: { name: "Lichterkette", description: "Bunte Lichter am Dach." },
  cat: { name: "Katze", description: "Wohnt jetzt hier. Einfach so." },
};

export interface PaintOption {
  key: string;
  name: string;
}
export const PAINTS: PaintOption[] = [
  { key: "cream", name: "Creme" },
  { key: "white", name: "Weiß" },
  { key: "sand", name: "Sand" },
  { key: "terracotta", name: "Terrakotta" },
  { key: "brick", name: "Backstein" },
  { key: "moss", name: "Moos" },
  { key: "sky", name: "Himmel" },
  { key: "slate", name: "Schiefer" },
  { key: "lavender", name: "Lavendel" },
  { key: "mint", name: "Minze" },
  { key: "rose", name: "Rosé" },
  { key: "midnight", name: "Mitternacht" },
  { key: "gold", name: "Gold" },
];

export const ROOF_STYLES = [
  { key: "gable", name: "Spitzdach" },
  { key: "flat", name: "Flachdach" },
  { key: "dome", name: "Kuppel" },
  { key: "castle", name: "Zinnen" },
] as const;

export const WINDOW_STYLES = [
  { key: "square", name: "Eckig" },
  { key: "round", name: "Rund" },
  { key: "cross", name: "Sprossen" },
  { key: "arch", name: "Bogen" },
  { key: "heart", name: "Herz" },
  { key: "stained", name: "Buntglas" },
] as const;

export type RoofStyle = (typeof ROOF_STYLES)[number]["key"];
export type WindowStyle = (typeof WINDOW_STYLES)[number]["key"];

export interface HouseDesign {
  wall: string;
  roof: string;
  door: string;
  roofStyle: RoofStyle;
  windows: WindowStyle;
}

export const DEFAULT_DESIGNS: Record<string, HouseDesign> = {
  hut: { wall: "sand", roof: "brick", door: "moss", roofStyle: "gable", windows: "square" },
  cottage: { wall: "cream", roof: "terracotta", door: "sky", roofStyle: "gable", windows: "cross" },
  tower: { wall: "white", roof: "slate", door: "terracotta", roofStyle: "gable", windows: "round" },
  villa: { wall: "cream", roof: "slate", door: "brick", roofStyle: "flat", windows: "cross" },
};

export function normalizeDesign(kind: string, raw: unknown): HouseDesign {
  const base = DEFAULT_DESIGNS[kind] ?? DEFAULT_DESIGNS["cottage"]!;
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof HouseDesign, unknown>>;
  const paint = (v: unknown, fb: string) => (typeof v === "string" && PAINTS.some((p) => p.key === v) ? v : fb);
  return {
    wall: paint(d.wall, base.wall),
    roof: paint(d.roof, base.roof),
    door: paint(d.door, base.door),
    roofStyle: ROOF_STYLES.some((r) => r.key === d.roofStyle) ? (d.roofStyle as RoofStyle) : base.roofStyle,
    windows: WINDOW_STYLES.some((w) => w.key === d.windows) ? (d.windows as WindowStyle) : base.windows,
  };
}

/** Catalog kinds a design uses (only those listed as "design" in the catalog cost Taler). */
export function designKinds(d: HouseDesign): string[] {
  return [`paint:${d.wall}`, `paint:${d.roof}`, `paint:${d.door}`, `roof:${d.roofStyle}`, `window:${d.windows}`];
}

/** Kinds in the design that are premium and not unlocked yet. */
export function lockedKinds(d: HouseDesign, premium: Map<string, number>, unlocked: Set<string>): string[] {
  return [...new Set(designKinds(d))].filter((k) => premium.has(k) && !unlocked.has(k));
}
