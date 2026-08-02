import { useCallback, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const samples = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  // Downsample to 16 kHz to keep the upload small.
  const target = 16000;
  const ratio = sampleRate / target;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const value = samples[Math.floor(i * ratio)] ?? 0;
    const clamped = Math.max(-1, Math.min(1, value));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(pos + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, out.length * 2, true);
  new Int16Array(buffer, 44).set(out);

  return new Blob([buffer], { type: "audio/wav" });
}

export type VoiceState = "idle" | "recording" | "transcribing";

export function useVoiceInput({
  language,
  onText,
  onError,
}: {
  language: string;
  onText: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const ref = useRef<{
    stream: MediaStream;
    context: AudioContext;
    source: MediaStreamAudioSourceNode;
    node: ScriptProcessorNode;
    chunks: Float32Array[];
  } | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const node = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(context.destination);
      ref.current = { stream, context, source, node, chunks };
      setState("recording");
    } catch {
      onError("microphone");
    }
  }, [onError]);

  const stop = useCallback(
    async (cancel = false) => {
      const current = ref.current;
      ref.current = null;
      if (!current) return;

      current.stream.getTracks().forEach((track) => track.stop());
      current.node.disconnect();
      current.source.disconnect();
      const sampleRate = current.context.sampleRate;
      await current.context.close().catch(() => {});

      if (cancel) {
        setState("idle");
        return;
      }

      const blob = encodeWav(current.chunks, sampleRate);
      if (blob.size < 4096) {
        setState("idle");
        onError("empty");
        return;
      }

      setState("transcribing");
      try {
        const { data } = await supabase.auth.getSession();
        const form = new FormData();
        form.append("audio", blob, "recording.wav");
        form.append("language", language);
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {},
          body: form,
        });
        if (!response.ok) throw new Error(await response.text());
        const result = (await response.json()) as { text?: string };
        if (result.text?.trim()) onText(result.text.trim());
        else onError("empty");
      } catch {
        onError("failed");
      } finally {
        setState("idle");
      }
    },
    [language, onText, onError],
  );

  return { state, start, stop };
}
