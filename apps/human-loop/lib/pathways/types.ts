/**
 * A pathway is a plain object (PathwayBundle) built by createPathway() from its JSON content and
 * a typed hub map. The game shell gets it as a prop and shares it through React context
 * (./context.tsx). Shared runtime code never imports a pathway's content directly.
 */
import type { HubContent } from "@/lib/game/hub";
import type { HubMap, StageSetup } from "@/lib/game/hubMap";
import type { SkillCopy, SkillInfo } from "@/lib/game/skills";
import type {
  AgentStep,
  BankTicket,
  CardDef,
  CardId,
  CheckQuestion,
  CoachInfo,
  Encounter,
  HeadlineKey,
  MasterySkillId,
  PathwayProgress,
  ShiftSpec,
  ShiftText,
  StepCategory,
} from "@/lib/game/types";
import type { LivePathwayId, PathwayMeta } from "@/lib/types";

export type { SkillCopy, StageSetup };

/** Wording a pathway may change on a card; the mechanics always come from CARDS. */
export type CardCopy = Partial<Pick<CardDef, "name" | "text" | "short" | "flavor">>;

/** content/<pathway>/pathway.json */
export interface PathwayJson {
  id: LivePathwayId;
  coach: CoachInfo;
  /** Clients the content may use (BankTicket.company, the ticket strings). */
  companies: string[];
  /** Step categories the content may use. */
  categories: StepCategory[];
  /** The one policy card of this pathway's story and dailies. */
  policyCard: CardId;
  copy: {
    /** Game bar: "Help Desk". */
    barTitle: string;
    /** Game bar, after the title: "· Fenwick IT". */
    barSub: string;
    /** How to play sheet eyebrow: "Dana's quick guide". */
    guideEyebrow: string;
    /** Replay the story shift: "Replay Monday". */
    replayStory: string;
    /** Result screen heading over the coach's note. */
    resultHeading: { won: string; lost: string };
  };
  /** Per-card wording overlay (empty on the help desk). */
  cards?: Partial<Record<CardId, CardCopy>>;
  /** Result headline pools; a missing key uses the engine's default pool. */
  headlines?: Partial<Record<HeadlineKey, string[]>>;
}

/** content/<pathway>/skills.json */
export interface SkillsJson {
  /** One line under each question title on Your skills (only when present). */
  questionHints?: Partial<Record<CheckQuestion, string>>;
  skills: Record<MasterySkillId, SkillCopy>;
}

/** Everything createPathway() needs. */
export interface PathwayInput {
  meta: PathwayMeta;
  pathway: PathwayJson;
  practice: Encounter;
  story: Encounter;
  hub: HubContent;
  skills: SkillsJson;
  bank: BankTicket[];
  shiftText: ShiftText;
  hubMap: HubMap;
}

export interface PathwayBundle {
  id: LivePathwayId;
  meta: PathwayMeta;
  config: PathwayJson;
  /** The agent (identical in every encounter of the pathway). */
  agent: Encounter["agent"];
  coach: CoachInfo;
  /** The coached practice shift (hydrated). */
  practice: Encounter;
  /** The fixed story shift (hydrated). */
  story: Encounter;
  /** [practice, story] */
  encounters: Encounter[];
  hub: HubContent;
  stage: StageSetup;
  skills: SkillsJson;
  bank: BankTicket[];
  /** Changes whenever a ticket or step id is added, removed or reordered. */
  bankVersion: string;
  shiftText: ShiftText;
  /** The fixed encounter with this id, or the story shift. */
  encounter(id: string | null | undefined): Encounter;
  /**
   * The encounter a saved battle belongs to: the generated shift in progress.shift when the ids
   * match (and it still fits the bank), else the fixed shift with that id (or the story).
   */
  encounterFor(id: string | null | undefined, progress?: Pick<PathwayProgress, "shift"> | null): Encounter;
  /** A saved Daily practice or drill spec can be rebuilt from the current bank. */
  shiftUsable(spec: ShiftSpec | null | undefined): spec is ShiftSpec;
  /** The encounter for a generated shift spec (cached, so the same spec gives the same object). */
  shiftEncounter(spec: ShiftSpec): Encounter;
  /** Any plan by id: the fixed shifts and the bank. */
  step(id: string | null | undefined): AgentStep | undefined;
  /** A skill with this pathway's copy. */
  skill(id: MasterySkillId): SkillInfo;
  /** CARDS[id] with this pathway's wording (name, text, short, flavor). */
  cardCopy(id: CardId): CardDef;
  planDaily(progress: PathwayProgress, opts: { playerId: string; today: string }): ShiftSpec;
  /** k defaults to progress.drillCount[skill]. */
  planDrill(progress: PathwayProgress, skill: MasterySkillId, opts: { playerId: string; today: string; k?: number }): ShiftSpec;
}
