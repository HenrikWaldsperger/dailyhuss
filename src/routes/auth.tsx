import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Anmelden – Tagwerk" },
      { name: "description", content: "Melde dich an, um deine Gewohnheiten und Ziele zu tracken." },
      { property: "og:title", content: "Anmelden – Tagwerk" },
      { property: "og:description", content: "Melde dich an, um deine Gewohnheiten und Ziele zu tracken." },
    ],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail ein").max(255),
  password: z.string().min(8, "Mindestens 8 Zeichen").max(72),
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/heute", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/heute", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === "forgot") {
      const parsed = z.string().trim().email("Bitte gib eine gültige E-Mail ein").safeParse(email);
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Ungültige E-Mail");
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return setError("Das hat nicht geklappt. Bitte versuch es später nochmal.");
      return setInfo("Wenn es ein Konto mit dieser E-Mail gibt, haben wir dir einen Link geschickt.");
    }
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben");
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setBusy(false);
      if (error) return setError("E-Mail oder Passwort stimmt nicht.");
      navigate({ to: "/heute", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      setBusy(false);
      if (error) return setError(error.message.includes("registered") ? "Diese E-Mail ist schon registriert." : "Registrierung fehlgeschlagen.");
      if (data.session) navigate({ to: "/heute", replace: true });
      else setInfo("Fast geschafft! Bitte bestätige deine E-Mail über den Link, den wir dir geschickt haben.");
    }
  }

  async function oauth(provider: "google" | "lovable") {
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) {
      toast.error("Anmeldung fehlgeschlagen. Bitte versuch es nochmal.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/heute", replace: true });
  }

  const title = mode === "signin" ? "Willkommen zurück" : mode === "signup" ? "Konto erstellen" : "Passwort vergessen";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center font-display text-3xl font-extrabold">
          Tagwerk<span className="text-accent">.</span>
        </Link>
        <div className="paper p-7 sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot" ? "Wir schicken dir einen Link zum Zurücksetzen." : "Deine Gewohnheiten, auf allen Geräten."}
          </p>

          {mode !== "forgot" && (
            <>
              <div className="mt-6 grid gap-2">
                <Button type="button" variant="google" className="h-11" onClick={() => oauth("google")}>
                  <GoogleLogo /> Weiter mit Google
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => oauth("lovable")}>
                  <LovableMark /> Weiter mit Lovable
                </Button>
              </div>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> oder <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className={cn("space-y-4", mode === "forgot" && "mt-6")}>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passwort</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground">
                      Passwort vergessen?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="rounded-xl bg-success/10 p-3 text-sm text-success">{info}</p>}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Einen Moment …" : mode === "signin" ? "Anmelden" : mode === "signup" ? "Registrieren" : "Link senden"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Noch kein Konto?{" "}
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode("signup"); setError(null); setInfo(null); }}>
                  Registrieren
                </button>
              </>
            ) : (
              <>
                {mode === "signup" ? "Schon ein Konto?" : "Doch wieder eingefallen?"}{" "}
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode("signin"); setError(null); setInfo(null); }}>
                  Anmelden
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
