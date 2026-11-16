import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  ratio: number;
  size?: number;
  stroke?: number;
  over?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({ ratio, size = 76, stroke = 8, over, className, children }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-habit/15" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out", over ? "stroke-destructive" : "stroke-habit")}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
