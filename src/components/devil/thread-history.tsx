import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createThread, deleteThread, listThreads } from "@/lib/chat.functions";

function whenLabel(iso: string) {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ThreadHistory({
  activeThreadId,
  onOpenThread,
}: {
  activeThreadId: string;
  onOpenThread: (threadId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const load = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);

  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: () => load(),
    enabled: open,
  });

  const newChat = useMutation({
    mutationFn: () => create(),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      setOpen(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="size-4" />
          <span className="hidden sm:inline">History</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[19rem] p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="font-display text-lg">Conversations</SheetTitle>
        </SheetHeader>

        <div className="px-3 py-3">
          <Button
            className="w-full justify-start gap-2"
            onClick={() => newChat.mutate()}
            disabled={newChat.isPending}
          >
            <Plus className="size-4" /> New chat
          </Button>
        </div>

        <nav className="max-h-[calc(100vh-9.5rem)] space-y-1 overflow-y-auto px-2 pb-6">
          {threads.isLoading ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">Loading…</p>
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
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 px-2 py-2.5 text-left"
              >
                <span className="block truncate text-sm text-foreground">{thread.title}</span>
                <span className="text-xs text-muted-foreground">
                  {whenLabel(thread.updated_at)}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete conversation"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeThread.mutate(thread.id)}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {threads.data?.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">No conversations yet.</p>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
