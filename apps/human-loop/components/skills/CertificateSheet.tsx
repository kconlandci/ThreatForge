"use client";

import { useEffect, useId, useState } from "react";
import { Download } from "lucide-react";
import { Sheet } from "@/components/battle/Sheet";
import { buttonClass } from "@/components/site/ui";
import {
  certificateFile,
  certificateText,
  drawCertificate,
  loadLogo,
  saveCertName,
  saveCertificate,
  savedCertName,
  type CertificateData,
} from "@/lib/client/certificate";

export interface CertificateSheetProps {
  open: boolean;
  onClose: () => void;
  /** Everything but the name, which the player types here. */
  data: Omit<CertificateData, "name">;
  /** A signed-up player's name, used when nothing was typed on this device yet. */
  defaultName?: string;
}

/**
 * The certificate of practice in a sheet: a preview, a name box, and "Save picture" (the phone's
 * share sheet when it can share files, else a download). The name stays on this device.
 */
export function CertificateSheet({ open, onClose, data, defaultName = "" }: CertificateSheetProps) {
  const titleId = useId();
  const nameId = useId();
  // A callback ref: the sheet mounts its body a render after `open`, so the draw waits for the canvas.
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  useEffect(() => {
    if (!open) return;
    // The name typed last on this device (cleared on sign out), else a signed-up player's own name.
    setName(savedCertName() || defaultName);
    setStatus("");
    let live = true;
    void loadLogo().then((img) => live && setLogo(img));
    return () => {
      live = false;
    };
  }, [open, defaultName]);

  const full: CertificateData = { ...data, name };
  const key = JSON.stringify(full);
  useEffect(() => {
    if (!open || !canvas) return;
    let live = true;
    // Fonts first, so the picture uses the game's typefaces.
    void (document.fonts?.ready ?? Promise.resolve()).then(() => live && drawCertificate(canvas, full, logo));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canvas, key, logo]);

  const save = async () => {
    if (!canvas || status === "saving") return;
    saveCertName(name);
    setStatus("saving");
    // Draw once more right now, so the file always matches what is typed.
    drawCertificate(canvas, full, logo);
    const file = await certificateFile(canvas, data.pathway);
    if (!file) return setStatus("error");
    const how = await saveCertificate(file);
    setStatus(how === "cancelled" ? "" : "saved");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-teal">You earned it</p>
          <h2 id={titleId} className="mt-0.5 font-display text-xl font-bold text-ink">
            Your certificate
          </h2>
        </div>
      }
    >
      <div data-certificate="">
        <canvas
          ref={setCanvas}
          width={1600}
          height={1131}
          className="block h-auto w-full rounded-lg border-2 border-ink"
          role="img"
          aria-label={certificateText(full).join(" ")}
        />
        <label htmlFor={nameId} className="mt-4 block font-display text-[16px] font-bold text-ink">
          Your name on the certificate
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={60}
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value);
            if (status === "saved") setStatus("");
          }}
          onBlur={() => saveCertName(name)}
          className="mt-2 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2.5 text-[16px] text-ink"
          placeholder="Type your name"
        />
        <p className="mt-1 text-[14px] text-muted">Your name stays on this device. We don&rsquo;t send it anywhere.</p>
        <button type="button" className={buttonClass("primary", "md", "mt-4 w-full")} onClick={() => void save()} aria-disabled={status === "saving" || undefined}>
          <Download className="h-5 w-5" aria-hidden="true" />
          Save picture
        </button>
        <p aria-live="polite" className="mt-2 min-h-5 text-[15px] font-semibold text-ink">
          {status === "saved" ? "Saved. You can print it or show it to your teacher or case worker." : status === "error" ? "Sorry, that didn't work. Try again." : ""}
        </p>
      </div>
    </Sheet>
  );
}
