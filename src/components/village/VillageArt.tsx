import type { ReactNode } from "react";
import { normalizeDesign, type HouseDesign, type WindowStyle } from "@/lib/village";

const INK = "var(--foreground)";
const SW = 1.4;
const paint = (key: string) => `var(--paint-${key})`;

interface Shape {
  x: number;
  w: number;
  top: number;
  floors: number;
}

const SHAPES: Record<string, Shape> = {
  hut: { x: 28, w: 44, top: 60, floors: 1 },
  cottage: { x: 18, w: 64, top: 52, floors: 1 },
  tower: { x: 33, w: 34, top: 28, floors: 3 },
  villa: { x: 10, w: 80, top: 40, floors: 2 },
};

const GROUND = 90;

function Roof({ s, d }: { s: Shape; d: HouseDesign }) {
  const fill = paint(d.roof);
  const { x, w, top } = s;
  switch (d.roofStyle) {
    case "flat":
      return <rect x={x - 4} y={top - 7} width={w + 8} height={8} rx={1.5} fill={fill} stroke={INK} strokeWidth={SW} />;
    case "dome":
      return <path d={`M${x - 2} ${top} A ${w / 2 + 2} ${Math.min(22, w / 2 + 2)} 0 0 1 ${x + w + 2} ${top} Z`} fill={fill} stroke={INK} strokeWidth={SW} />;
    case "castle": {
      const n = Math.max(3, Math.round(w / 12));
      const step = (w + 6) / (2 * n - 1);
      return (
        <g fill={fill} stroke={INK} strokeWidth={SW}>
          <rect x={x - 3} y={top - 8} width={w + 6} height={9} />
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={x - 3 + i * 2 * step} y={top - 14} width={step} height={7} />
          ))}
        </g>
      );
    }
    default: {
      const h = Math.min(30, w * 0.55);
      return <polygon points={`${x - 5},${top} ${x + w / 2},${top - h} ${x + w + 5},${top}`} fill={fill} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />;
    }
  }
}

function Window({ cx, cy, style }: { cx: number; cy: number; style: WindowStyle }) {
  const r = 5;
  const common = { stroke: INK, strokeWidth: SW };
  switch (style) {
    case "round":
      return <circle cx={cx} cy={cy} r={r} fill="var(--glass)" {...common} />;
    case "cross":
      return (
        <g>
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="var(--glass)" {...common} />
          <path d={`M${cx} ${cy - r}V${cy + r}M${cx - r} ${cy}H${cx + r}`} {...common} />
        </g>
      );
    case "arch":
      return <path d={`M${cx - r} ${cy + r}V${cy - 1}A${r} ${r} 0 0 1 ${cx + r} ${cy - 1}V${cy + r}Z`} fill="var(--glass)" {...common} />;
    case "heart":
      return (
        <path
          d={`M${cx} ${cy + 5}C${cx - 8} ${cy - 1} ${cx - 4} ${cy - 7} ${cx} ${cy - 3}C${cx + 4} ${cy - 7} ${cx + 8} ${cy - 1} ${cx} ${cy + 5}Z`}
          fill="var(--paint-rose)"
          {...common}
        />
      );
    case "stained":
      return (
        <g>
          <rect x={cx - r} y={cy - r} width={r} height={r} fill="var(--paint-sky)" />
          <rect x={cx} y={cy - r} width={r} height={r} fill="var(--paint-gold)" />
          <rect x={cx - r} y={cy} width={r} height={r} fill="var(--paint-rose)" />
          <rect x={cx} y={cy} width={r} height={r} fill="var(--paint-mint)" />
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="none" {...common} />
          <path d={`M${cx} ${cy - r}V${cy + r}M${cx - r} ${cy}H${cx + r}`} {...common} />
        </g>
      );
    default:
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={1} fill="var(--glass)" {...common} />;
  }
}

function Decoration({ kind, s }: { kind: string; s: Shape }) {
  const { x, w, top } = s;
  const doorX = x + w / 2;
  switch (kind) {
    case "chimney":
      return (
        <g>
          <rect x={x + w * 0.68} y={top - 24} width={7} height={16} fill="var(--paint-brick)" stroke={INK} strokeWidth={SW} />
          <circle cx={x + w * 0.68 + 3.5} cy={top - 29} r={3} fill="var(--stone)" className="animate-drift" />
        </g>
      );
    case "flag": {
      const px = x + w / 2;
      const py = top - (s.floors > 0 ? 34 : 30);
      return (
        <g>
          <path d={`M${px} ${top - 12}V${py}`} stroke={INK} strokeWidth={SW} />
          <path d={`M${px} ${py}l11 3.5l-11 3.5Z`} fill="var(--accent)" stroke={INK} strokeWidth={1} />
        </g>
      );
    }
    case "garland":
      return (
        <g>
          <path d={`M${x} ${top + 3}Q${x + w / 2} ${top + 10} ${x + w} ${top + 3}`} fill="none" stroke={INK} strokeWidth={0.8} />
          {[0.15, 0.32, 0.5, 0.68, 0.85].map((t, i) => (
            <circle key={t} cx={x + w * t} cy={top + 3 + 7 * (1 - Math.pow(2 * t - 1, 2)) * 0.9} r={1.8} fill={["var(--paint-gold)", "var(--accent)", "var(--paint-sky)", "var(--paint-mint)", "var(--paint-rose)"][i]} />
          ))}
        </g>
      );
    case "flowerbox": {
      const y = GROUND - (GROUND - top) / (s.floors + 0.4) + 6;
      return (
        <g>
          <rect x={x + 4} y={y} width={14} height={3.5} fill="var(--wood)" stroke={INK} strokeWidth={1} />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={x + 6 + i * 3.4} cy={y - 1} r={1.6} fill={i % 2 ? "var(--paint-rose)" : "var(--paint-gold)"} />
          ))}
        </g>
      );
    }
    case "lantern":
      return (
        <g>
          <rect x={doorX + 8} y={GROUND - 20} width={4} height={5} rx={1} fill="var(--glow)" stroke={INK} strokeWidth={1} />
        </g>
      );
    case "mailbox":
      return (
        <g>
          <path d={`M${x - 6} ${GROUND}V${GROUND - 8}`} stroke={INK} strokeWidth={SW} />
          <rect x={x - 10} y={GROUND - 13} width={8} height={5} rx={2} fill="var(--accent)" stroke={INK} strokeWidth={1} />
        </g>
      );
    case "fence":
      return (
        <g stroke={INK} strokeWidth={1} fill="var(--paint-white)">
          <path d={`M2 ${GROUND - 3}H98`} />
          {Array.from({ length: 9 }, (_, i) => (i === 4 ? null : <rect key={i} x={3 + i * 11} y={GROUND - 8} width={3.5} height={8} />))}
        </g>
      );
    case "cat":
      return (
        <g fill="var(--paint-midnight)">
          <ellipse cx={x + w + 6} cy={GROUND - 4} rx={4} ry={4} />
          <circle cx={x + w + 6} cy={GROUND - 10} r={2.8} />
          <path d={`M${x + w + 3.8} ${GROUND - 12}l0.6 -3l1.6 2ZM${x + w + 8.2} ${GROUND - 12}l-0.6 -3l-1.6 2Z`} />
          <path d={`M${x + w + 10} ${GROUND - 2}q4 -2 2 -7`} fill="none" stroke="var(--paint-midnight)" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

export function House({ kind, design, decorations = [] }: { kind: string; design: unknown; decorations?: string[] }) {
  const d = normalizeDesign(kind, design);
  const s = SHAPES[kind] ?? SHAPES["cottage"]!;
  const height = GROUND - s.top;
  const floorH = height / s.floors;
  const doorW = Math.min(12, s.w * 0.24);
  const doorH = Math.min(18, floorH * 0.7);
  const windows: ReactNode[] = [];
  for (let f = 0; f < s.floors; f++) {
    const cy = s.top + floorH * f + floorH * (f === s.floors - 1 ? 0.38 : 0.5);
    const cols = s.w > 60 ? 3 : s.w > 40 ? 2 : 1;
    for (let c = 0; c < cols; c++) {
      const cx = s.x + (s.w / (cols + 1)) * (c + 1);
      // skip the window where the door is on the ground floor
      if (f === s.floors - 1 && Math.abs(cx - (s.x + s.w / 2)) < doorW && cols !== 2) continue;
      windows.push(<Window key={`${f}-${c}`} cx={cols === 2 && f === s.floors - 1 ? (c === 0 ? s.x + s.w * 0.2 : s.x + s.w * 0.8) : cx} cy={cy} style={d.windows} />);
    }
  }
  const behind = decorations.filter((k) => k === "chimney" || k === "flag");
  const front = decorations.filter((k) => k !== "chimney" && k !== "flag");
  return (
    <g>
      {behind.map((k) => (
        <Decoration key={k} kind={k} s={s} />
      ))}
      <rect x={s.x} y={s.top} width={s.w} height={height} fill={paint(d.wall)} stroke={INK} strokeWidth={SW} />
      <Roof s={s} d={d} />
      {windows}
      <rect x={s.x + s.w / 2 - doorW / 2} y={GROUND - doorH} width={doorW} height={doorH} rx={doorW / 2.5} fill={paint(d.door)} stroke={INK} strokeWidth={SW} />
      <circle cx={s.x + s.w / 2 + doorW / 4} cy={GROUND - doorH / 2} r={0.9} fill={INK} />
      {front.map((k) => (
        <Decoration key={k} kind={k} s={s} />
      ))}
    </g>
  );
}

function Thing({ kind }: { kind: string }) {
  const st = { stroke: INK, strokeWidth: SW };
  switch (kind) {
    case "tree":
      return (
        <g>
          <rect x={46} y={60} width={8} height={30} fill="var(--wood)" {...st} />
          <circle cx={50} cy={46} r={22} fill="var(--leaf)" {...st} />
          <circle cx={40} cy={42} r={5} fill="var(--leaf-dark)" opacity={0.5} />
          <circle cx={58} cy={52} r={4} fill="var(--leaf-dark)" opacity={0.5} />
        </g>
      );
    case "pine":
      return (
        <g>
          <rect x={46} y={76} width={8} height={14} fill="var(--wood)" {...st} />
          <polygon points="50,14 72,50 28,50" fill="var(--leaf-dark)" {...st} strokeLinejoin="round" />
          <polygon points="50,32 78,78 22,78" fill="var(--leaf-dark)" {...st} strokeLinejoin="round" />
        </g>
      );
    case "bush":
      return (
        <g fill="var(--leaf)" {...st}>
          <circle cx={38} cy={78} r={12} />
          <circle cx={62} cy={78} r={12} />
          <circle cx={50} cy={70} r={14} />
        </g>
      );
    case "flowerbed":
      return (
        <g>
          <ellipse cx={50} cy={84} rx={34} ry={8} fill="var(--wood)" {...st} />
          {[22, 34, 46, 58, 70, 78].map((cx, i) => (
            <g key={cx}>
              <path d={`M${cx} 84V${72 - (i % 2) * 4}`} stroke="var(--leaf-dark)" strokeWidth={1.4} />
              <circle cx={cx} cy={70 - (i % 2) * 4} r={4} fill={["var(--paint-rose)", "var(--paint-gold)", "var(--paint-lavender)"][i % 3]} {...st} strokeWidth={1} />
            </g>
          ))}
        </g>
      );
    case "bench":
      return (
        <g {...st}>
          <rect x={22} y={62} width={56} height={6} rx={2} fill="var(--wood)" />
          <rect x={20} y={72} width={60} height={6} rx={2} fill="var(--wood)" />
          <path d="M26 78V90M74 78V90" />
        </g>
      );
    case "streetlamp":
      return (
        <g>
          <path d="M50 90V34" stroke={INK} strokeWidth={2.4} />
          <circle cx={50} cy={30} r={12} fill="var(--glow)" opacity={0.35} />
          <rect x={44} y={24} width={12} height={12} rx={3} fill="var(--glow)" {...st} />
          <rect x={42} y={20} width={16} height={4} rx={1} fill="var(--paint-slate)" {...st} />
        </g>
      );
    case "pond":
      return (
        <g>
          <ellipse cx={50} cy={76} rx={38} ry={14} fill="var(--water)" {...st} />
          <ellipse cx={38} cy={74} rx={6} ry={3} fill="var(--leaf)" />
          <circle cx={39} cy={72} r={2} fill="var(--paint-rose)" />
          <path d="M58 72q6 -2 12 0" stroke="var(--paint-white)" strokeWidth={1.2} fill="none" />
        </g>
      );
    case "well":
      return (
        <g {...st}>
          <path d="M30 40L50 26L70 40Z" fill="var(--paint-terracotta)" strokeLinejoin="round" />
          <path d="M34 40V66M66 40V66" />
          <path d="M50 40V56" strokeWidth={1} />
          <rect x={46} y={56} width={8} height={6} fill="var(--wood)" />
          <rect x={26} y={66} width={48} height={24} rx={4} fill="var(--stone)" />
          <path d="M26 76H74M42 66V76M58 66V76M34 76V90M50 76V90M66 76V90" strokeWidth={0.8} />
        </g>
      );
    case "windmill":
      return (
        <g>
          <polygon points="38,90 44,36 56,36 62,90" fill="var(--paint-cream)" {...st} strokeLinejoin="round" />
          <path d="M42 34L50 24L58 34Z" fill="var(--paint-brick)" {...st} />
          <rect x={46} y={74} width={8} height={16} rx={4} fill="var(--wood)" {...st} />
          <g className="animate-spin-slow" style={{ transformOrigin: "50px 38px", transformBox: "view-box" }}>
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a} 50 38)`}>
                <rect x={48.5} y={8} width={3} height={30} fill="var(--wood)" />
                <rect x={51.5} y={10} width={9} height={24} fill="var(--paint-white)" {...st} strokeWidth={1} />
              </g>
            ))}
          </g>
          <circle cx={50} cy={38} r={3} fill={INK} />
        </g>
      );
    default:
      return null;
  }
}

/** Renders any village item inside a 100×100 tile. */
export function VillageItemArt({
  kind,
  category,
  design,
  decorations,
  className,
}: {
  kind: string;
  category: string;
  design?: unknown;
  decorations?: string[] | undefined;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <ellipse cx={50} cy={91} rx={40} ry={4} fill={INK} opacity={0.08} />
      {category === "house" ? <House kind={kind} design={design} decorations={decorations ?? []} /> : <Thing kind={kind} />}
    </svg>
  );
}

/** Small preview of a decoration for the shop. */
export function DecorationArt({ kind, className }: { kind: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g transform="translate(0 4)">
        <House kind="hut" design={{ wall: "cream", roof: "terracotta", door: "sky" }} decorations={[kind]} />
      </g>
    </svg>
  );
}
