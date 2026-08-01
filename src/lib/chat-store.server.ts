import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { UIMessage } from "ai";

function isNewSupabaseApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createUserSupabase(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured.");

  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticateRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;

  const supabase = createUserSupabase(token);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { supabase, userId: data.claims.sub as string };
}

type Client = ReturnType<typeof createUserSupabase>;

export function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

export async function persistMessage(
  supabase: Client,
  userId: string,
  threadId: string,
  message: UIMessage,
) {
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: message.role,
    parts: message.parts as never,
    client_message_id: message.id ?? null,
  });
  if (error) console.error("[chat] failed to save message", error.message);
}

export async function touchThread(
  supabase: Client,
  threadId: string,
  firstUserText: string | null,
) {
  const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };

  if (firstUserText) {
    const { data } = await supabase
      .from("chat_threads")
      .select("title")
      .eq("id", threadId)
      .maybeSingle();
    if (data && (data.title === "New chat" || !data.title)) {
      patch.title = firstUserText.replace(/\s+/g, " ").slice(0, 70) || "New chat";
    }
  }

  const { error } = await supabase.from("chat_threads").update(patch).eq("id", threadId);
  if (error) console.error("[chat] failed to update thread", error.message);
}
