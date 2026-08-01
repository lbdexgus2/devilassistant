import { useCallback, useEffect, useState } from "react";

export type Tone = "bone" | "ink";
export type Language = "en" | "th";
export type ModelId = "openai/gpt-5.6-sol" | "openai/gpt-5.6-terra" | "openai/gpt-5.6-luna";

export type DevilSettings = {
  tone: Tone;
  language: Language;
  model: ModelId;
  showThinking: boolean;
  denseText: boolean;
};

export const MODEL_LABELS: Record<ModelId, string> = {
  "openai/gpt-5.6-sol": "Deep — most thorough",
  "openai/gpt-5.6-terra": "Balanced — everyday",
  "openai/gpt-5.6-luna": "Swift — fastest",
};

const KEY = "devil-ai.settings.v1";

const DEFAULTS: DevilSettings = {
  tone: "bone",
  language: "en",
  model: "openai/gpt-5.6-sol",
  showThinking: true,
  denseText: false,
};

function read(): DevilSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevilSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function applyTone(tone: Tone) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", tone === "ink");
}

const listeners = new Set<(value: DevilSettings) => void>();

export function useDevilSettings() {
  const [settings, setSettings] = useState<DevilSettings>(DEFAULTS);

  useEffect(() => {
    const initial = read();
    setSettings(initial);
    applyTone(initial.tone);
    const listener = (value: DevilSettings) => setSettings(value);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((patch: Partial<DevilSettings>) => {
    const next = { ...read(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    applyTone(next.tone);
    listeners.forEach((listener) => listener(next));
  }, []);

  return { settings, update };
}
