import { supabase } from "@/integrations/supabase/client";
import type { FileUIPart } from "ai";

const BUCKET = "chat-attachments";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Local prompt-input attachments carry blob: URLs. Persist them to storage and
 * swap in long-lived signed URLs so the model and the saved thread can read them.
 */
export async function uploadAttachments(
  files: FileUIPart[],
  userId: string,
  threadId: string,
): Promise<FileUIPart[]> {
  const uploaded: FileUIPart[] = [];

  for (const file of files) {
    if (!file.url?.startsWith("blob:")) {
      uploaded.push(file);
      continue;
    }

    const blob = await (await fetch(file.url)).blob();
    const safeName = (file.filename ?? "file").replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${userId}/${threadId}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: file.mediaType || blob.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, YEAR_SECONDS);
    if (signError || !data?.signedUrl) {
      throw new Error(`Could not link the file: ${signError?.message ?? "unknown error"}`);
    }

    uploaded.push({
      type: "file",
      ...(file.filename ? { filename: file.filename } : {}),
      mediaType: file.mediaType || blob.type || "application/octet-stream",
      url: data.signedUrl,
    });
  }

  return uploaded;
}
