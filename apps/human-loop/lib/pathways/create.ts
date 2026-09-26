/**
 * createPathway(): content JSON + hub map -> PathwayBundle. Pure; no React, no content imports.
 */
import { CARDS } from "@/lib/game/cards";
import { SKILL_BASE, type SkillInfo } from "@/lib/game/skills";
import { FALLBACK_DAILY, bankVersionOf, buildShift, planDaily, planDrill, specProblem } from "@/lib/game/shiftGen";
import type { AgentStep, CardDef, CardId, Encounter, MasterySkillId, ShiftSpec } from "@/lib/game/types";
import type { PathwayBundle, PathwayInput } from "./types";

/** Built encounters kept per pathway (enough for a daily, a drill and a few replays). */
const SHIFT_CACHE_MAX = 8;

export function createPathway(input: PathwayInput): PathwayBundle {
  const { meta, pathway: config, hub, skills, bank, shiftText, hubMap } = input;
  if (meta.id !== config.id) throw new Error(`pathway.json id "${config.id}" does not match the meta "${meta.id}"`);
  const prefix = meta.idPrefix;
  if (!prefix) throw new Error(`Pathway "${meta.id}" has no idPrefix`);

  const hydrate = (enc: Encounter): Encounter => ({
    ...enc,
    coach: { ...config.coach },
    ...(config.headlines ? { headlines: config.headlines } : {}),
    ...(config.noBlockCue ? { noBlockCue: true } : {}),
  });
  const practice = hydrate(input.practice);
  const story = hydrate(input.story);
  const encounters = [practice, story];
  const agent = story.agent;
  const bankVersion = bankVersionOf(bank);

  const skillInfo = new Map<MasterySkillId, SkillInfo>();
  const skill = (id: MasterySkillId): SkillInfo => {
    let info = skillInfo.get(id);
    if (!info) {
      const copy = skills.skills[id];
      if (!copy) throw new Error(`Pathway "${meta.id}" has no skills.json copy for "${id}"`);
      info = { ...SKILL_BASE[id], ...copy };
      skillInfo.set(id, info);
    }
    return info;
  };

  const shiftUsable = (spec: ShiftSpec | null | undefined): spec is ShiftSpec =>
    !!spec && spec.id.startsWith(`${prefix}-`) && specProblem(bank, spec) === null;

  const built = new Map<string, Encounter>();
  const shiftEncounter = (spec: ShiftSpec): Encounter => {
    const key = JSON.stringify([spec.id, spec.seed, spec.stepIds, spec.ticketIds, spec.focus, spec.kind, spec.bankVersion]);
    let enc = built.get(key);
    if (!enc) {
      enc = buildShift(bank, spec, shiftText, {
        agent,
        pathwayId: meta.id,
        coach: config.coach,
        headlines: config.headlines,
        policyCard: config.policyCard,
        noBlockCue: config.noBlockCue,
        skillCopy: skill,
      });
      if (built.size >= SHIFT_CACHE_MAX) built.delete(built.keys().next().value as string);
      built.set(key, enc);
    }
    return enc;
  };

  const encounter = (id: string | null | undefined): Encounter => encounters.find((e) => e.id === id) ?? story;

  let allSteps: Map<string, AgentStep> | null = null;
  const cards = new Map<CardId, CardDef>();

  return {
    id: config.id,
    meta,
    config,
    agent,
    coach: config.coach,
    practice,
    story,
    encounters,
    hub,
    stage: { hubMap, agentSprite: agent.spriteKey as PathwayBundle["stage"]["agentSprite"], coachSprite: config.coach.spriteKey as PathwayBundle["stage"]["coachSprite"] },
    skills,
    bank,
    bankVersion,
    shiftText,
    encounter,
    encounterFor(id, progress) {
      const spec = progress?.shift;
      if (spec && spec.id === id && shiftUsable(spec)) return shiftEncounter(spec);
      return encounter(id);
    },
    shiftUsable,
    shiftEncounter,
    step(id) {
      if (!id) return undefined;
      allSteps ??= new Map([...encounters.flatMap((e) => e.steps), ...bank.flatMap((t) => t.steps)].map((s) => [s.id, s]));
      return allSteps.get(id);
    },
    skill,
    cardCopy(id) {
      let def = cards.get(id);
      if (!def) {
        const over = config.cards?.[id] ?? {};
        def = { ...CARDS[id] };
        for (const k of ["name", "text", "short", "flavor"] as const) if (over[k] !== undefined) def[k] = over[k] as string;
        cards.set(id, def);
      }
      return def;
    },
    planDaily(progress, opts) {
      return planDaily(bank, progress, { ...opts, prefix, fallback: shiftText.fallbackDaily ?? FALLBACK_DAILY });
    },
    planDrill(progress, skillId, opts) {
      return planDrill(bank, skillId, {
        playerId: opts.playerId,
        today: opts.today,
        k: opts.k ?? progress.drillCount?.[skillId] ?? 0,
        progress,
        prefix,
      });
    },
  };
}
