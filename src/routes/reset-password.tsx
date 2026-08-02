import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import devilMark from "@/assets/devil-mark.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Devil AI" },
      {
        name: "description",
        content: "Choose a new password for your Devil AI account and get back to your research threads.",
      },
      { property: "og:title", content: "Set a new password — Devil AI" },
      {
        property: "og:description",
        content: "Choose a new Devil AI password and get back to your saved threads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      if (current.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      void navigate({ to: "/chat" });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="paper-grain flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={devilMark}
            alt="Devil AI emblem"
            width={64}
            height={64}
            className="size-14 dark:invert"
          />
          <h1 className="wordmark mt-4 text-4xl">Devil AI</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
          <h2 className="font-display text-xl">Set a new password</h2>
          {ready ? (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save new password
              </Button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Open this page from the reset message we emailed you, then set a new password here.
            </p>
          )}
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void navigate({ to: "/auth" })}>
            Back to sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
