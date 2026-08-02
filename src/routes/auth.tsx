import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import devilMark from "@/assets/devil-mark.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Devil AI research assistant" },
      {
        name: "description",
        content:
          "Sign in to Devil AI to keep every research thread, calculation and cited answer saved to your account.",
      },
      { property: "og:title", content: "Sign in — Devil AI" },
      {
        property: "og:description",
        content: "Deep answers with real sources and shown work. Sign in to continue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "signup" | "reset">(null);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/chat" });
  }, [loading, session, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("signup");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/chat" });
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
          <p className="mt-2 text-sm text-muted-foreground">
            Deep answers. Real sources. Shown work.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
          {sent ? (
            <div className="text-center">
              <h2 className="font-display text-xl">Check your inbox</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {sent === "signup"
                  ? `We sent a confirmation message to ${email}. Open it to activate your account.`
                  : `We sent a password reset message to ${email}. Open it to set a new password.`}
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  setSent(null);
                  setMode("signin");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode === "forgot" ? (
                <div className="mb-4 text-center">
                  <h2 className="font-display text-xl">Reset your password</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your email and we'll send you a reset message.
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={google}
                  >
                    Continue with Google
                  </Button>

                  <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={80}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                {mode === "forgot" ? null : (
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset email"
                      : "Sign in"}
                </Button>
              </form>

              {mode === "signin" ? (
                <button
                  type="button"
                  className="mt-3 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
              ) : null}

              <button
                type="button"
                className="mt-3 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setMode(mode === "signup" ? "signin" : mode === "forgot" ? "signin" : "signup")}
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : mode === "forgot"
                    ? "Back to sign in"
                    : "New here? Create an account"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

