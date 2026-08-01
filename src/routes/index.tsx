import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { applyTone } from "@/lib/devil-settings";
import devilMark from "@/assets/devil-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Devil AI — deep research, code and math answers" },
      {
        name: "description",
        content:
          "Devil AI searches the web, reads the sources, runs the numbers and answers straight — with saved chat history, image and file uploads.",
      },
      { property: "og:title", content: "Devil AI — deep answers, real sources" },
      {
        property: "og:description",
        content:
          "An AI research desk for hard questions: live web search, cited sources, verified calculations and full chat history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    applyTone(
      (typeof window !== "undefined" &&
        (JSON.parse(window.localStorage.getItem("devil-ai.settings.v1") ?? "{}") as {
          tone?: "bone" | "ink";
        }).tone) ||
        "bone",
    );
  }, []);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/chat", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="paper-grain flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <img
        src={devilMark}
        alt="Devil AI emblem"
        width={96}
        height={96}
        className="size-20 dark:invert"
      />
      <h1 className="wordmark mt-6 text-5xl sm:text-6xl">Devil AI</h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        Ask the hard questions. It searches, reads the sources, runs the numbers, and answers
        straight — with every thread saved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => void navigate({ to: "/auth" })} disabled={loading}>
          Start a conversation
        </Button>
      </div>
      <ul className="mt-12 grid max-w-2xl gap-3 text-left text-sm sm:grid-cols-3">
        {[
          ["Live web search", "Cited links, read before quoting."],
          ["Verified math", "Formulas substituted and checked."],
          ["Photos & files", "Drop an image or PDF into the chat."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-xl border border-border bg-card p-4 shadow-float">
            <p className="font-display text-base">{title}</p>
            <p className="mt-1 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
