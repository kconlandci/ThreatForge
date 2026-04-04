// ============================================================
// ThreatForge — Lab Manifest Schema v1.1
// TypeScript types + Zod runtime validation
// ============================================================

import { z } from "zod/v4";

// --- Schema Versioning ---
export const SCHEMA_VERSION = "1.1" as const;

// --- Enums ---
export const TierEnum = z.enum(["beginner", "intermediate", "advanced"]);
export type Tier = z.infer<typeof TierEnum>;

export const TrackEnum = z.enum([
  "blue-team-foundations",
  "network-defense",
  "identity-access",
  "detection-hunting",
  "vulnerability-hardening",
  "incident-response",
  "cloud-security",
]);
export type Track = z.infer<typeof TrackEnum>;

export const RendererTypeEnum = z.enum([
  "action-rationale",
  "toggle-config",
  "investigate-decide",
  "triage-remediate",
]);
export type RendererType = z.infer<typeof RendererTypeEnum>;

export const AccessLevelEnum = z.enum(["free", "premium"]);
export type AccessLevel = z.infer<typeof AccessLevelEnum>;

export const DifficultyEnum = z.enum(["easy", "moderate", "challenging"]);
export type DifficultyLabel = z.infer<typeof DifficultyEnum>;

export const LabStatusEnum = z.enum(["draft", "published"]);
export type LabStatus = z.infer<typeof LabStatusEnum>;

// --- Shared Elements ---

export const DisplayFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
  emphasis: z.enum(["normal", "warn", "critical"]).optional(),
});
export type DisplayField = z.infer<typeof DisplayFieldSchema>;

export const RationaleSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type Rationale = z.infer<typeof RationaleSchema>;

export const ScenarioFeedbackSchema = z.object({
  perfect: z.string(),
  partial: z.string(),
  wrong: z.string(),
});
export type ScenarioFeedback = z.infer<typeof ScenarioFeedbackSchema>;

export const ActionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.enum(["blue", "green", "yellow", "orange", "red"]).optional(),
});
export type ActionOption = z.infer<typeof ActionOptionSchema>;

// --- Scenario Types ---

export const ActionRationaleScenarioSchema = z.object({
  type: z.literal("action-rationale"),
  id: z.string(),
  title: z.string().optional(),
  context: z.string(),
  displayFields: z.array(DisplayFieldSchema).default([]),
  evidence: z.array(z.string()).optional(),
  logEntry: z.string().optional(),
  actions: z.array(ActionOptionSchema).min(2).max(5),
  correctActionId: z.string(),
  rationales: z.array(RationaleSchema).min(2).max(5),
  correctRationaleId: z.string(),
  feedback: ScenarioFeedbackSchema,
});
export type ActionRationaleScenario = z.infer<typeof ActionRationaleScenarioSchema>;

export const ToggleConfigItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  currentState: z.string(),
  correctState: z.string(),
  states: z.array(z.string()).min(2),
  rationaleId: z.string(),
});

export const ToggleConfigScenarioSchema = z.object({
  type: z.literal("toggle-config"),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetSystem: z.string(),
  items: z.array(ToggleConfigItemSchema).min(2),
  rationales: z.array(RationaleSchema).min(1),
  feedback: ScenarioFeedbackSchema,
});
export type ToggleConfigScenario = z.infer<typeof ToggleConfigScenarioSchema>;

export const InvestigationSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  content: z.string(),
  isCritical: z.boolean().optional(),
});

export const InvestigateDecideScenarioSchema = z.object({
  type: z.literal("investigate-decide"),
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  investigationData: z.array(InvestigationSourceSchema).min(2),
  actions: z.array(ActionOptionSchema).min(2).max(5),
  correctActionId: z.string(),
  rationales: z.array(RationaleSchema).min(2).max(5),
  correctRationaleId: z.string(),
  feedback: ScenarioFeedbackSchema,
});
export type InvestigateDecideScenario = z.infer<typeof InvestigateDecideScenarioSchema>;

export const EvidenceItemSchema = z.object({
  type: z.string(),
  content: z.string(),
  icon: z.string().optional(),
});

export const ClassificationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export const RemediationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export const TriageRemediateScenarioSchema = z.object({
  type: z.literal("triage-remediate"),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.array(EvidenceItemSchema).min(1),
  classifications: z.array(ClassificationOptionSchema).min(2),
  correctClassificationId: z.string(),
  remediations: z.array(RemediationOptionSchema).min(2),
  correctRemediationId: z.string(),
  rationales: z.array(RationaleSchema).min(2),
  correctRationaleId: z.string(),
  feedback: ScenarioFeedbackSchema,
});
export type TriageRemediateScenario = z.infer<typeof TriageRemediateScenarioSchema>;

// --- Discriminated Union ---
export const ScenarioSchema = z.discriminatedUnion("type", [
  ActionRationaleScenarioSchema,
  ToggleConfigScenarioSchema,
  InvestigateDecideScenarioSchema,
  TriageRemediateScenarioSchema,
]);
export type Scenario = z.infer<typeof ScenarioSchema>;

// --- Scoring ---
export const ScoringConfigSchema = z.object({
  maxScore: z.literal(100),
  hintPenalty: z.number().min(1).max(20),
  penalties: z.object({
    perfect: z.literal(0),
    partial: z.number().min(1).max(50),
    wrong: z.number().min(1).max(50),
  }),
  passingThresholds: z.object({
    pass: z.number().min(50).max(100),
    partial: z.number().min(20).max(80),
  }),
});
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;

// --- Prerequisites ---
export const PrerequisiteRuleSchema = z.object({
  labId: z.string(),
  minScore: z.number().optional(),
});
export type PrerequisiteRule = z.infer<typeof PrerequisiteRuleSchema>;

// --- Lab Manifest ---
export const LabManifestSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string(),
  version: z.number().int().min(1),
  title: z.string().min(3).max(80),

  tier: TierEnum,
  track: TrackEnum,
  difficulty: DifficultyEnum,
  accessLevel: AccessLevelEnum,
  tags: z.array(z.string()),

  description: z.string().min(10).max(300),
  estimatedMinutes: z.number().min(1).max(60),
  learningObjectives: z.array(z.string()).min(3).max(7),
  sortOrder: z.number().int(),

  status: LabStatusEnum,
  prerequisites: z.array(PrerequisiteRuleSchema),

  rendererType: RendererTypeEnum,
  scenarios: z.array(ScenarioSchema).min(3).max(5),
  hints: z.tuple([z.string(), z.string(), z.string()]),

  scoring: ScoringConfigSchema,

  careerInsight: z.string(),
  toolRelevance: z.array(z.string()).min(1),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LabManifest = z.infer<typeof LabManifestSchema>;

// --- Catalog ---
export type LabCatalog = LabManifest[];
