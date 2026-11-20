"use client";

import { useEffect, useRef, useState } from "react";
import { Speech, Square } from "lucide-react";
import { READ_ALOUD_EVENT, canSpeak, readAloudPref, speak, stopSpeaking } from "@/lib/client/speech";

/** Whether Listen buttons show: the browser has a voice and the Menu switch is on (client only). */
export function useReadAloud(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const update = () => setOn(canSpeak() && readAloudPref());
    update();
    window.addEventListener(READ_ALOUD_EVENT, update);
    return () => window.removeEventListener(READ_ALOUD_EVENT, update);
  }, []);
  return on;
}

/**
 * A round "Listen" button: reads `text` aloud, and stops on a second tap. Renders nothing where the
 * browser has no voice or the player turned Read aloud off.
 */
export function ListenButton({ text, label = "Listen", className = "" }: { text: string; label?: string; className?: string }) {
  const on = useReadAloud();
  const [speaking, setSpeaking] = useState(false);
  // Each reading gets a number: a late "ended" from an earlier, cancelled reading is ignored.
  const reading = useRef(0);
  const speakingRef = useRef(false);
  speakingRef.current = speaking;
  const stopMine = () => {
    reading.current++;
    if (speakingRef.current) stopSpeaking();
    setSpeaking(false);
  };
  // Unmount, or new words (the next plan, the next result): stop only what this button started.
  useEffect(
    () => () => {
      reading.current++;
      if (speakingRef.current) stopSpeaking();
    },
    [],
  );
  useEffect(() => {
    stopMine();
  }, [text]);
  if (!on) return null;
  return (
    <button
      type="button"
      className={`grid h-11 w-11 flex-none place-items-center rounded-full border-2 border-ink ${speaking ? "bg-teal text-white" : "bg-paper text-ink"} ${className}`}
      aria-label={speaking ? "Stop reading" : label}
      data-listen=""
      onClick={() => {
        if (speaking) return stopMine();
        const mine = ++reading.current;
        if (speak(text, () => mine === reading.current && setSpeaking(false))) setSpeaking(true);
      }}
    >
      {speaking ? <Square className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Speech className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
