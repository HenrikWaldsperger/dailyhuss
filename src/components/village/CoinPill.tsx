import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { coinsQueryOptions } from "@/lib/village-queries";

export function CoinPill() {
  const { data } = useQuery(coinsQueryOptions);
  if (data === undefined) return null;
  return (
    <Link
      to="/dorf"
      className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-semibold shadow-paper transition-colors hover:bg-secondary"
      aria-label={`${data} Taler`}
    >
      <span aria-hidden>🪙</span>
      <span className="tabular">{data}</span>
    </Link>
  );
}
