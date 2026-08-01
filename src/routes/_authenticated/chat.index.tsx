import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { startChat } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatBootstrap,
});

function ChatBootstrap() {
  const navigate = useNavigate();
  const start = useServerFn(startChat);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      // Reuse the newest blank thread so repeated visits don't create duplicates.
      const target = await start();
      void navigate({
        to: "/chat/$threadId",
        params: { threadId: target.id },
        replace: true,
      });
    })();
  }, [start, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Shimmer>Opening your workspace…</Shimmer>
    </div>
  );
}
