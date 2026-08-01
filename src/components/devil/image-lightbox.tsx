import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download } from "lucide-react";

export function ImageLightbox({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-float focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Open ${alt} full size`}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[min(96vw,1200px)] border-border bg-card p-2 sm:p-3"
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[82vh] w-full rounded-lg object-contain"
          />
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <p className="truncate text-xs text-muted-foreground">{alt}</p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="size-3.5" /> Open original
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
