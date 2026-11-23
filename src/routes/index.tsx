import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-still-life.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DailyHuss – Gewohnheiten & Ziele einfach tracken" },
      {
        name: "description",
        content: "Wasser trinken, weniger Bildschirmzeit, mehr lernen: DailyHuss hilft dir, tägliche Gewohnheiten und langfristige Ziele im Blick zu behalten.",
      },
      { property: "og:title", content: "DailyHuss – Gewohnheiten & Ziele einfach tracken" },
      {
        property: "og:description",
        content: "Wasser trinken, weniger Bildschirmzeit, mehr lernen – Tag für Tag sichtbar besser werden.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const examples = [
  { emoji: "💧", color: "lagoon", title: "Wasser", text: "8 Gläser am Tag – ein Tipp pro Glas." },
  { emoji: "📱", color: "coral", title: "Bildschirmzeit", text: "Höchstens 60 Minuten Social Media." },
  { emoji: "📚", color: "sun", title: "Lernen", text: "30 Minuten täglich oder 100 Stunden bis zum Sommer." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="font-display text-2xl font-extrabold">
          DailyHuss<span className="text-accent">.</span>
        </span>
        <Button asChild variant="ghost">
          {signedIn ? <Link to="/heute">Zu meinem Tag</Link> : <Link to="/auth">Anmelden</Link>}
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div>
            <p className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              Kleine Schritte. Jeden Tag.
            </p>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              Mach aus Vorsätzen <span className="text-accent">Gewohnheiten</span>.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Tracke, was dir wichtig ist – vom Glas Wasser bis zum großen Jahresziel. Mit Serien, Verlauf und ehrlichem Fortschritt.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to={signedIn ? "/heute" : "/auth"}>
                  {signedIn ? "Zu meinem Tag" : "Kostenlos loslegen"} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <div className="paper overflow-hidden p-0">
            <img src={heroImage} alt="Wasserglas, Smartphone und Bücherstapel" width={1280} height={1024} className="h-full w-full object-cover" />
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {examples.map((e) => (
            <div key={e.title} data-habit={e.color} className="paper flex gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-habit/15 text-2xl">{e.emoji}</span>
              <div>
                <h2 className="text-lg font-bold">{e.title}</h2>
                <p className="text-sm text-muted-foreground">{e.text}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
