import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Neues Passwort – DailyHuss" },
      { name: "description", content: "Lege ein neues Passwort für dein DailyHuss-Konto fest." },
      { property: "og:title", content: "Neues Passwort – DailyHuss" },
      { property: "og:description", content: "Lege ein neues Passwort für dein DailyHuss-Konto fest." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Mindestens 8 Zeichen");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Das hat nicht geklappt. Fordere bitte einen neuen Link an.");
    toast.success("Passwort geändert");
    navigate({ to: "/heute", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="paper w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Neues Passwort</h1>
        {ready ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Neues Passwort</Label>
              <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              Speichern
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-muted-foreground">
            Öffne diese Seite über den Link aus der E-Mail.{" "}
            <Link to="/auth" className="font-semibold text-primary hover:underline">Zur Anmeldung</Link>
          </p>
        )}
      </div>
    </div>
  );
}
