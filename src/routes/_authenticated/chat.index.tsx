import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { createThread, listThreads } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatBootstrap,
});

function ChatBootstrap() {
  const navigate = useNavigate();
  const load = useServerFn(listThreads);
  const create = useServerFn(createThread);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const threads = await load();
      const target = threads[0] ?? (await create());
      if (!cancelled) {
        void navigate({
          to: "/chat/$threadId",
          params: { threadId: target.id },
          replace: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, create, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Shimmer>Opening your workspace…</Shimmer>
    </div>
  );
}
