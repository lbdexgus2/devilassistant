import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import type { UIMessage } from "ai";
import { Plus } from "lucide-react";

import { ChatWindow } from "@/components/devil/chat-window";
import { PolicyGate } from "@/components/devil/policy-gate";
import { SettingsDialog } from "@/components/devil/settings-dialog";
import { ThreadHistory, ThreadSidebar } from "@/components/devil/thread-history";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { createThread, getThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Devil AI" },
      {
        name: "description",
        content:
          "Your Devil AI conversation: searched sources, shown work and straight answers, saved to your account.",
      },
      { property: "og:title", content: "Chat — Devil AI" },
      {
        property: "og:description",
        content: "Deep answers with real sources and shown work.",
      },
    ],
  }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { t } = useI18n();
  const load = useServerFn(getThread);
  const create = useServerFn(createThread);

  const thread = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => load({ data: { threadId } }),
  });

  const refreshThreads = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["threads"] });
  }, [queryClient]);

  const startNewChat = useCallback(async () => {
    const next = await create();
    refreshThreads();
    void navigate({ to: "/chat/$threadId", params: { threadId: next.id } });
  }, [create, navigate, refreshThreads]);

  const openThread = useCallback(
    (id: string) => void navigate({ to: "/chat/$threadId", params: { threadId: id } }),
    [navigate],
  );

  return (
    <div className="paper-grain flex h-screen w-full bg-background">
      <ThreadSidebar activeThreadId={threadId} onOpenThread={openThread} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 px-2 sm:px-4">
          <div className="flex items-center gap-1">
            <ThreadHistory activeThreadId={threadId} onOpenThread={openThread} />
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => void startNewChat()}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.newChat}</span>
            </Button>
          </div>

          <h1 className="wordmark pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">
            Devil AI
          </h1>

          <SettingsDialog email={user?.email ?? null} />
        </header>

        {thread.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Shimmer>{t.loadingConversation}</Shimmer>
          </div>
        ) : thread.data?.thread ? (
          <ChatWindow
            key={threadId}
            threadId={threadId}
            initialMessages={(thread.data.messages ?? []) as unknown as UIMessage[]}
            onTitleMaybeChanged={refreshThreads}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{t.gone}</p>
            <Button onClick={() => void startNewChat()}>{t.startNew}</Button>
          </div>
        )}
      </div>

      <PolicyGate userId={user?.id ?? null} />
    </div>
  );
}
