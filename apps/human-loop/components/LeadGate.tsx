"use client";

import { useState } from "react";
import { getProfile, setProfile } from "@/lib/player";
import { Wordmark } from "./Logo";

export function LeadGate({
  pathwayName,
  onReady,
}: {
  pathwayName: string;
  onReady: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter your name and a valid email to continue.");
      return;
    }
    setLoading(true);
    const existing = getProfile();
    const playerId = existing?.playerId;
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, playerId, pathwayInterest: pathwayName }),
      });
      const data = await res.json();
      setProfile({
        playerId: data.playerId ?? playerId ?? crypto.randomUUID(),
        name,
        email,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setProfile({
        playerId: playerId ?? crypto.randomUUID(),
        name,
        email,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      onReady();
    }
  }

  return (
    <div className="mx-auto max-w-md animate-rise-in">
      <div className="mb-6 flex justify-center">
        <Wordmark size="md" />
      </div>
      <form
        onSubmit={submit}
        className="rounded-2xl border border-loop-border bg-loop-bg-card p-7"
      >
        <h1 className="font-display text-xl font-semibold">Before you start the {pathwayName} track</h1>
        <p className="mt-1.5 text-sm text-loop-text-muted">
          Tell us who you are so we can save your score. No password, no spam — just a way to track
          your progress across pathways.
        </p>
        <div className="mt-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-loop-border bg-loop-bg-elevated px-4 py-3 text-sm text-loop-text outline-none placeholder:text-loop-text-muted focus:border-loop-green"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-lg border border-loop-border bg-loop-bg-elevated px-4 py-3 text-sm text-loop-text outline-none placeholder:text-loop-text-muted focus:border-loop-green"
          />
        </div>
        {error && <p className="mt-3 text-sm text-loop-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-loop-green px-6 py-3.5 text-center font-semibold text-loop-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Enter the simulator →"}
        </button>
        <p className="mt-3 text-center text-xs text-loop-text-muted">
          Interested in the real program? DCI follows up with everyone who plays.
        </p>
      </form>
    </div>
  );
}
