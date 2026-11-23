import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, House, LogOut, MessageCircle, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LevelPill } from "@/components/rewards/LevelPill";
import { CoinPill } from "@/components/village/CoinPill";
import { RewardSync } from "@/components/rewards/RewardSync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/heute", label: "Heute", icon: CalendarCheck },
  { to: "/erfolge", label: "Erfolge", icon: Trophy },
  { to: "/dorf", label: "Dorf", icon: House },
  { to: "/coach", label: "Coach", icon: MessageCircle },
] as const;

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/heute" className="font-display text-2xl font-extrabold tracking-tight">
              DailyHuss<span className="text-accent">.</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="rounded-xl px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <CoinPill />
            <LevelPill />
            <span className="hidden text-sm text-muted-foreground lg:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Abmelden">
              <LogOut /> <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
      </header>
      <nav className="sticky bottom-0 z-30 order-last grid grid-cols-4 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Navigation">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-accent" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
      <RewardSync />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
