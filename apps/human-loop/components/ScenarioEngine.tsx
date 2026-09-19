"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PathwayPack, PathwayRunResult, ScenarioResult } from "@/lib/types";
import { getProfile, saveRun } from "@/lib/player";
import { LoopMark } from "./Logo";

type Phase = "intro" | "active" | "feedback" | "results";

const SCORE_CORRECT = 100;
const SCORE_CORRECT_WITH_HINT = 65;
const SCORE_INCORRECT = 25;

function badgeFor(pct: number) {
  if (pct === 100) return { label: "Loop Master", color: "var(--loop-green)" };
  if (pct >= 80) return { label: "Trusted Overseer", color: "var(--loop-green)" };
  if (pct >= 50) return { label: "Cautious Reviewer", color: "var(--loop-amber)" };
  return { label: "Rubber-Stamp Risk", color: "var(--loop-red)" };
}

export function ScenarioEngine({ pack }: { pack: PathwayPack }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [saved, setSaved] = useState(false);

  const scenario = pack.scenarios[index];
  const selectedOption = useMemo(
    () => scenario?.options.find((o) => o.id === selectedId) ?? null,
    [scenario, selectedId]
  );

  function pickOption(optionId: string) {
    if (phase !== "active") return;
    const option = scenario.options.find((o) => o.id === optionId);
    if (!option) return;
    setSelectedId(optionId);
    const score = option.isCorrect
      ? usedHint
        ? SCORE_CORRECT_WITH_HINT
        : SCORE_CORRECT
      : SCORE_INCORRECT;
    setResults((prev) => [
      ...prev,
      {
        scenarioId: scenario.id,
        pathwayId: pack.pathwayId,
        optionId,
        correct: option.isCorrect,
        usedHint,
        score,
      },
    ]);
    setPhase("feedback");
  }

  function next() {
    if (index + 1 < pack.scenarios.length) {
      setIndex((i) => i + 1);
      setSelectedId(null);
      setUsedHint(false);
      setShowHint(false);
      setPhase("active");
    } else {
      setPhase("results");
      void persistResults();
    }
  }

  async function persistResults() {
    if (saved) return;
    setSaved(true);
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const run: PathwayRunResult = {
      pathwayId: pack.pathwayId,
      score: totalScore,
      maxScore: pack.scenarios.length * SCORE_CORRECT,
      completedAt: new Date().toISOString(),
      results,
    };
    saveRun(run);
    const profile = getProfile();
    if (profile) {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: profile.playerId, run }),
        });
      } catch {
        // best-effort — local save already succeeded
      }
    }
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl animate-rise-in">
        <div className="rounded-2xl border border-loop-border bg-loop-bg-card p-8">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-loop-text-muted">
            <LoopMark className="h-5 w-5" />
            {pack.pathwayName}
          </div>
          <h1 className="font-display text-3xl font-semibold">{pack.agentPersona}</h1>
          <p className="mt-3 text-loop-text-muted">{pack.roleBlurb}</p>
          <div className="mt-6 rounded-xl border border-loop-border bg-loop-bg-elevated p-4 text-sm text-loop-text-muted">
            {pack.scenarios.length} scenarios · You review what the agent wants to do, then approve,
            reject, edit, or escalate. There&rsquo;s one clearly right call each time.
          </div>
          <button
            onClick={() => setPhase("active")}
            className="mt-7 w-full rounded-xl bg-loop-green px-6 py-3.5 text-center font-semibold text-loop-bg transition hover:brightness-110"
          >
            Start reviewing →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const maxScore = pack.scenarios.length * SCORE_CORRECT;
    const pct = Math.round((totalScore / maxScore) * 100);
    const badge = badgeFor(pct);
    const correctCount = results.filter((r) => r.correct).length;

    return (
      <div className="mx-auto max-w-2xl animate-rise-in">
        <div className="rounded-2xl border border-loop-border bg-loop-bg-card p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-loop-text-muted">
            {pack.pathwayName} — complete
          </p>
          <p
            className="mt-3 inline-block rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: badge.color, color: badge.color }}
          >
            {badge.label}
          </p>
          <div className="mt-5 font-display text-6xl font-bold">{pct}%</div>
          <p className="mt-2 text-loop-text-muted">
            {correctCount} of {pack.scenarios.length} calls made correctly
          </p>

          <div className="mt-7 space-y-2 text-left">
            {pack.scenarios.map((s, i) => {
              const r = results[i];
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-loop-border bg-loop-bg-elevated px-4 py-3 text-sm"
                >
                  <span className="text-loop-text-muted">{s.title}</span>
                  <span
                    className="font-semibold"
                    style={{ color: r?.correct ? "var(--loop-green)" : "var(--loop-red)" }}
                  >
                    {r?.correct ? "Caught it" : "Missed it"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/play"
              className="flex-1 rounded-xl border border-loop-border px-5 py-3 text-center font-semibold text-loop-text transition hover:border-loop-green"
            >
              Try another pathway
            </Link>
            <a
              href="https://www.dciresourcesllc.com"
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-loop-green px-5 py-3 text-center font-semibold text-loop-bg transition hover:brightness-110"
            >
              See the real {pack.pathwayName} program →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // active + feedback share the same scenario "stage"
  return (
    <div className="mx-auto max-w-2xl animate-rise-in">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-loop-text-muted">
        <span>
          {pack.pathwayName} · Scenario {index + 1} of {pack.scenarios.length}
        </span>
        <span>{scenario.skillTag}</span>
      </div>
      <div className="mb-5 flex gap-1.5">
        {pack.scenarios.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i < index ? "var(--loop-green)" : i === index ? "var(--loop-border)" : "var(--loop-bg-card)",
              outline: i === index ? "1px solid var(--loop-border)" : "none",
            }}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-loop-border bg-loop-bg-card p-6 md:p-8">
        <h2 className="font-display text-xl font-semibold">{scenario.title}</h2>
        <p className="mt-2 text-sm text-loop-text-muted">{scenario.setup}</p>

        <div className="mt-5 rounded-xl border border-loop-border bg-loop-bg-elevated p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-loop-violet">
            <span className="inline-block h-2 w-2 animate-pulse-ring rounded-full bg-loop-violet" />
            {pack.agentPersona} says
          </div>
          <p className="font-medium text-loop-text">{scenario.agentMessage}</p>
          {scenario.agentContext && scenario.agentContext.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-loop-border pt-3 font-mono text-xs text-loop-text-muted">
              {scenario.agentContext.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>

        {phase === "active" && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-loop-text">What do you do?</p>
              {!showHint && (
                <button
                  onClick={() => {
                    setShowHint(true);
                    setUsedHint(true);
                  }}
                  className="text-xs font-semibold text-loop-amber hover:underline"
                >
                  Need a hint? (−35 pts)
                </button>
              )}
            </div>
            {showHint && (
              <p className="mt-2 rounded-lg border border-loop-amber/40 bg-loop-amber/10 p-3 text-sm text-loop-amber">
                💡 {scenario.hint}
              </p>
            )}
            <div className="mt-4 grid gap-3">
              {scenario.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => pickOption(option.id)}
                  className="rounded-xl border border-loop-border bg-loop-bg-elevated px-4 py-3.5 text-left text-sm font-medium text-loop-text transition hover:border-loop-green hover:bg-loop-bg-card"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "feedback" && selectedOption && (
          <div className="mt-6">
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: selectedOption.isCorrect ? "var(--loop-green)" : "var(--loop-red)",
                background: selectedOption.isCorrect
                  ? "color-mix(in srgb, var(--loop-green) 10%, transparent)"
                  : "color-mix(in srgb, var(--loop-red) 10%, transparent)",
              }}
            >
              <p
                className="text-sm font-bold"
                style={{ color: selectedOption.isCorrect ? "var(--loop-green)" : "var(--loop-red)" }}
              >
                {selectedOption.isCorrect ? "Good call." : "Not quite."}
              </p>
              <p className="mt-1.5 text-sm text-loop-text">{selectedOption.rationale}</p>
              <p className="mt-2 text-sm italic text-loop-text-muted">{selectedOption.consequence}</p>
            </div>
            <div className="mt-4 rounded-xl border border-loop-border bg-loop-bg-elevated p-4 text-sm">
              <p className="font-semibold text-loop-violet">On the job</p>
              <p className="mt-1 text-loop-text-muted">{scenario.careerInsight}</p>
            </div>
            <button
              onClick={next}
              className="mt-6 w-full rounded-xl bg-loop-green px-6 py-3.5 text-center font-semibold text-loop-bg transition hover:brightness-110"
            >
              {index + 1 < pack.scenarios.length ? "Next scenario →" : "See your results →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
