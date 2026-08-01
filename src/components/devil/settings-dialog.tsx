import { Settings2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MODEL_LABELS, useDevilSettings, type ModelId, type Tone } from "@/lib/devil-settings";

const TONES: Array<{ id: Tone; label: string; hint: string; swatch: string }> = [
  { id: "bone", label: "Bone white", hint: "Paper light", swatch: "bg-[oklch(0.985_0.003_85)]" },
  { id: "ink", label: "Ink black", hint: "Night ink", swatch: "bg-[oklch(0.155_0.004_60)]" },
];

export function SettingsDialog({ email }: { email: string | null }) {
  const { settings, update } = useDevilSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings2 className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Settings</DialogTitle>
          <DialogDescription>Tune the tone, depth and answer style.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2.5">
            <Label>Web tone</Label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => update({ tone: tone.id })}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    settings.tone === tone.id
                      ? "border-accent bg-secondary"
                      : "border-border hover:bg-secondary/60"
                  }`}
                >
                  <span
                    className={`size-7 shrink-0 rounded-full border border-border ${tone.swatch}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{tone.label}</span>
                    <span className="block text-xs text-muted-foreground">{tone.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Depth of thinking</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => update({ model: value as ModelId })}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODEL_LABELS).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="thinking">Show working steps</Label>
              <p className="text-xs text-muted-foreground">
                Live search, reading and calculation activity.
              </p>
            </div>
            <Switch
              id="thinking"
              checked={settings.showThinking}
              onCheckedChange={(checked) => update({ showThinking: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="dense">Compact text</Label>
              <p className="text-xs text-muted-foreground">Smaller type, tighter lines.</p>
            </div>
            <Switch
              id="dense"
              checked={settings.denseText}
              onCheckedChange={(checked) => update({ denseText: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <p className="min-w-0 truncate text-sm text-muted-foreground">{email ?? "Signed in"}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) toast.error(error.message);
                else window.location.assign("/auth");
              }}
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
