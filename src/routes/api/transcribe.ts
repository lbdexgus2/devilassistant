import { createFileRoute } from "@tanstack/react-router";

import { authenticateRequest } from "@/lib/chat-store.server";

const MAX_BYTES = 20 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Speech is not configured", { status: 500 });

        const form = await request.formData();
        const audio = form.get("audio");
        const language = form.get("language");
        if (!(audio instanceof File) || audio.size === 0) {
          return new Response("No audio uploaded", { status: 400 });
        }
        if (audio.size > MAX_BYTES) {
          return new Response("Audio is too large", { status: 413 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, "recording.wav");
        if (language === "th" || language === "en") {
          upstream.append("language", language);
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error("[transcribe] failed", response.status, detail);
          return new Response(detail || "Transcription failed", { status: response.status });
        }

        const data = (await response.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
