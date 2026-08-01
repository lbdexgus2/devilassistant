import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PanelLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { deleteThread, listThreads, startChat } from "@/lib/chat.functions";

function useWhenLabel() {
  const { t } = useI18n();
  return (iso: string) => {
    const date = new Date(iso);
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return t.yesterday;
    if (days < 7) return t.daysAgo(days);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };
}

function ThreadList({
  activeThreadId,
  onOpenThread,
  onNavigate,
  enabled = true,
}: {
  activeThreadId: string;
  onOpenThread: (threadId: string) => void;
  onNavigate?: () => void;
  enabled?: boolean;
}) {
  const { t } = useI18n();
  const whenLabel = useWhenLabel();
  const queryClient = useQueryClient();
  const load = useServerFn(listThreads);
  const start = useServerFn(startChat);
  const remove = useServerFn(deleteThread);

  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: () => load(),
    enabled,
  });

  const newChat = useMutation({
    mutationFn: () => start(),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      onNavigate?.();
      onOpenThread(thread.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeThread = useMutation({
    mutationFn: (threadId: string) => remove({ data: { threadId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["threads"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 py-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => newChat.mutate()}
          disabled={newChat.isPending}
        >
          <Plus className="size-4" /> {t.newChat}
        </Button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        {threads.isLoading ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">{t.loadingThreads}</p>
        ) : null}
        {threads.data?.map((thread) => (
          <div
            key={thread.id}
            className={`group flex items-center gap-1 rounded-lg px-1 ${
              thread.id === activeThreadId ? "bg-secondary" : "hover:bg-secondary/60"
            }`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              onClick={() => onNavigate?.()}
              className="min-w-0 flex-1 px-2 py-2.5 text-left"
            >
              <span className="block truncate text-sm text-foreground">{thread.title}</span>
              <span className="text-xs text-muted-foreground">{whenLabel(thread.updated_at)}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.deleteConversation}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => removeThread.mutate(thread.id)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {threads.data?.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">{t.noConversations}</p>
        ) : null}
      </nav>
    </div>
  );
}

/** Always-visible sidebar for wide screens. */
export function ThreadSidebar({
  activeThreadId,
  onOpenThread,
}: {
  activeThreadId: string;
  onOpenThread: (threadId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-border bg-card/60 md:flex">
      <div className="flex h-14 shrink-0 items-center px-4">
        <span className="font-display text-lg">{t.conversations}</span>
      </div>
      <ThreadList activeThreadId={activeThreadId} onOpenThread={onOpenThread} />
    </aside>
  );
}

/** Icon-opened drawer for phones. */
export function ThreadHistory({
  activeThreadId,
  onOpenThread,
}: {
  activeThreadId: string;
  onOpenThread: (threadId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 md:hidden" aria-label={t.history}>
          <PanelLeft className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[19rem] flex-col p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="font-display text-lg">{t.conversations}</SheetTitle>
        </SheetHeader>
        <ThreadList
          activeThreadId={activeThreadId}
          onOpenThread={onOpenThread}
          onNavigate={() => setOpen(false)}
          enabled={open}
        />
      </SheetContent>
    </Sheet>
  );
}
