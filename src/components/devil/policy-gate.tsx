import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const POLICY_VERSION = "v1";

function storageKey(userId: string) {
  return `devil-ai.policy.${POLICY_VERSION}.${userId}`;
}

export function PolicyGate({ userId }: { userId: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(storageKey(userId)) !== "accepted");
  }, [userId]);

  if (!userId) return null;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.policyTitle}</DialogTitle>
          <DialogDescription>{t.policyIntro}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-3">
          <ul className="space-y-3 text-sm text-foreground">
            {t.policyPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/auth");
            }}
          >
            {t.policyDecline}
          </Button>
          <Button
            onClick={() => {
              window.localStorage.setItem(storageKey(userId), "accepted");
              setOpen(false);
            }}
          >
            {t.policyAccept}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
