import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";


export type ThreadSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadSummary[]> => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadSummary> => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: "New chat" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

/** Reuse the newest empty thread instead of piling up blank "New chat" rows. */
export const startChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadSummary> => {
    const { data: recent } = await context.supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    const candidate = recent?.[0];
    if (candidate) {
      const { count } = await context.supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", candidate.id);
      if (!count) return candidate;
    }

    const { data, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: "New chat" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .delete()
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; title: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .update({ title: data.title.slice(0, 120) || "New chat" })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      thread: ThreadSummary | null;
      messages: Array<{ id: string; role: string; parts: Json[] }>;
    }> => {
      const { data: thread } = await context.supabase
        .from("chat_threads")
        .select("id, title, updated_at")
        .eq("id", data.threadId)
        .maybeSingle();
      if (!thread) return { thread: null, messages: [] };

      const { data: rows, error } = await context.supabase
        .from("chat_messages")
        .select("id, role, parts")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);

      const messages = (rows ?? []).map((row) => ({
        id: row.id,
        role: row.role,
        parts: (Array.isArray(row.parts) ? row.parts : []) as Json[],
      }));

      return { thread, messages };
    },
  );
