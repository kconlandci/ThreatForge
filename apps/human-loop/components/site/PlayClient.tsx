"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Info, RotateCcw, UserRound, X } from "lucide-react";
import {
  continueAsGuest,
  getPathwayProgress,
  loadSave,
  resetSave,
  signUp,
  syncFromCloud,
  type SaveData,
} from "@/lib/client/save";
import { preloadStageWhenIdle } from "@/lib/client/preloadStage";
import { PathwayPicker } from "./PathwayPicker";
import { SignUpForm, type SignUpValues } from "./SignUpForm";
import { buttonClass } from "./ui";

type Notice = { tone: "success" | "info"; title: string; body: string };

function Loading() {
  return (
    <div role="status" className="mx-auto max-w-4xl">
      <span className="sr-only">Loading your save…</span>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="h-9 w-64 rounded-xl bg-paper-soft" />
        <div className="mt-4 h-5 w-80 max-w-full rounded-lg bg-paper-soft" />
        <div className="mt-8 h-72 rounded-3xl border-2 border-line bg-paper-soft" />
      </div>
    </div>
  );
}

function SignUpView({
  headingRef,
  onSignUp,
  onGuest,
}: {
  headingRef: React.Ref<HTMLHeadingElement>;
  onSignUp: (v: SignUpValues) => Promise<void>;
  onGuest: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-[1.75rem] border-2 border-ink bg-paper shadow-[0_6px_0_0_var(--hl-ink)] md:grid md:grid-cols-[1fr_1.1fr]">
        {/* Welcome panel */}
        <div className="relative flex flex-col overflow-hidden bg-teal px-5 pb-0 pt-5 text-paper sm:px-8 sm:pt-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="relative">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-teal-tint">
              Fenwick IT Solutions · Help Desk
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 font-display text-[1.9rem] font-bold leading-[1.1] tracking-tight focus:outline-none sm:text-4xl"
            >
              Clock in for your first shift
            </h1>
            <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-teal-tint">
              Sign up to save your progress. Or jump in as a guest.
            </p>
            <ul className="mt-6 hidden space-y-2.5 md:block">
              {["Read ResetBot's plan", "Inspect the evidence", "Block it, escalate it, or let it run"].map((t, i) => (
                <li key={t} className="flex items-center gap-3 text-[16px] font-semibold text-paper">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-sm font-bold text-ink">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-3 flex items-end justify-between gap-2 md:mt-auto md:pt-8" aria-hidden="true">
            <div className="relative mb-16 max-w-[13.5rem] rounded-2xl border-2 border-ink bg-paper px-3.5 py-2.5 font-display text-[14px] font-medium leading-snug text-ink shadow-[0_4px_0_0_var(--hl-ink)] sm:mb-28 sm:max-w-[12.5rem] sm:text-[15px]">
              A new human! Tell me your name. I promise not to reset it.
              <svg viewBox="0 0 24 16" className="absolute -bottom-[14px] right-6 h-4 w-6" focusable="false">
                <path d="M2 0 L22 0 L18 14 Z" fill="var(--hl-paper)" />
                <path d="M2 0 L18 14 L22 0" fill="none" stroke="var(--hl-ink)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <Image
              src="/game/sprites/resetbot-eager.svg"
              alt=""
              unoptimized
              priority
              width={220}
              height={220}
              className="hl-float -mr-4 h-32 w-32 shrink-0 sm:h-48 sm:w-48"
            />
          </div>
        </div>
        {/* Form */}
        <div className="p-5 sm:p-8">
          <SignUpForm onSignUp={onSignUp} onGuest={onGuest} />
        </div>
      </div>
    </div>
  );
}

function PlayerBar({
  save,
  onReset,
}: {
  save: SaveData;
  onReset: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const startOverRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const guest = save.profile?.guest ?? true;
  const name = guest ? "Guest" : save.profile?.name || "Player";

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <div className="rounded-2xl border-2 border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex min-w-0 items-center gap-2 text-[17px] text-ink">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-tint text-teal">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate">
            Playing as <strong className="font-display font-bold">{name}</strong>
          </span>
        </p>
        {!confirming ? (
          <button
            ref={startOverRef}
            type="button"
            onClick={() => setConfirming(true)}
            className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold text-teal underline decoration-2 underline-offset-4 hover:text-teal-dark hover:decoration-orange"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Not you? Start over
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div className="mt-3 rounded-xl bg-orange-tint p-4" role="group" aria-labelledby="start-over-title">
          <p id="start-over-title" className="font-display font-bold text-ink">
            Start over?
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
            {guest
              ? "This deletes your progress on this device."
              : "This deletes your name, email, and progress from this device and from our database."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              ref={confirmRef}
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onReset();
                } finally {
                  setBusy(false);
                }
              }}
              className={buttonClass("secondary", "md", "min-h-11 text-[15px]")}
            >
              {busy ? "Deleting…" : "Yes, delete and start over"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                requestAnimationFrame(() => startOverRef.current?.focus());
              }}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold text-ink underline decoration-2 underline-offset-4"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PlayClient() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    let alive = true;
    setSave(loadSave());
    syncFromCloud().then((s) => {
      if (alive) setSave(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // After a view change (sign-up, guest, start over), move focus to the new page heading.
  const view = save === null ? "loading" : save.profile ? "picker" : "signup";

  // The picker is one tap from the game: fetch the game stage in the background.
  useEffect(() => {
    if (view === "picker") return preloadStageWhenIdle();
  }, [view]);
  useEffect(() => {
    if (moveFocus.current && view !== "loading") {
      moveFocus.current = false;
      headingRef.current?.focus();
    }
  }, [view]);

  const handleSignUp = useCallback(async (values: SignUpValues) => {
    const { stored, save: next } = await signUp(values);
    moveFocus.current = true;
    const n: Notice = stored
      ? {
          tone: "success",
          title: `You're signed up, ${values.name.split(" ")[0]}.`,
          body: "We'll back up your progress as you play.",
        }
      : {
          tone: "info",
          title: "Saved on this device.",
          body: "Your progress stays in this browser for now.",
        };
    setNotice(n);
    setAnnouncement(`${n.title} ${n.body}`);
    setSave(next);
  }, []);

  const handleGuest = useCallback(() => {
    moveFocus.current = true;
    const n: Notice = { tone: "info", title: "Playing as a guest.", body: "Your progress stays on this device." };
    setNotice(n);
    setAnnouncement(`${n.title} ${n.body}`);
    setSave(continueAsGuest());
  }, []);

  const handleReset = useCallback(async () => {
    const { save: fresh, serverDeleted } = await resetSave();
    moveFocus.current = true;
    setNotice(null);
    setAnnouncement(
      serverDeleted
        ? "Done. Your saved data was deleted. You can sign up again or play as a guest."
        : "Your progress on this device was deleted. We could not reach our server to delete the online copy. Please try again later.",
    );
    setSave(fresh);
  }, []);

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {save === null ? (
        <Loading />
      ) : !save.profile ? (
        <SignUpView headingRef={headingRef} onSignUp={handleSignUp} onGuest={handleGuest} />
      ) : (
        <PickerView
          save={save}
          notice={notice}
          headingRef={headingRef}
          onDismiss={() => setNotice(null)}
          onReset={handleReset}
        />
      )}
    </>
  );
}

function PickerView({
  save,
  notice,
  headingRef,
  onDismiss,
  onReset,
}: {
  save: SaveData;
  notice: Notice | null;
  headingRef: React.Ref<HTMLHeadingElement>;
  onDismiss: () => void;
  onReset: () => Promise<void>;
}) {
  const helpDesk = save.pathways["help-desk"] ? getPathwayProgress(save, "help-desk") : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink focus:outline-none sm:text-4xl"
        >
          Choose your pathway
        </h1>
        <p className="text-lg leading-relaxed text-ink-soft">
          Pick a career. Meet your AI coworker. Keep it out of trouble.
        </p>
      </div>

      {notice ? (
        <div className="mt-5">
          <div
            className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 ${
              notice.tone === "success" ? "border-teal bg-teal-tint" : "border-line bg-paper-soft"
            }`}
          >
            {notice.tone === "success" ? (
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            )}
            <p className="flex-1 text-[16px] leading-snug text-ink">
              <strong className="font-display font-bold">{notice.title}</strong> {notice.body}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Dismiss message</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <PlayerBar save={save} onReset={onReset} />
      </div>

      <div className="mt-8">
        <PathwayPicker helpDesk={helpDesk} />
      </div>
    </div>
  );
}
