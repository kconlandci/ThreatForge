export type OversightOption = {
  id: string;
  label: string;
  isCorrect: boolean;
  rationale: string;
  consequence: string;
};

export type Scenario = {
  id: string;
  title: string;
  setup: string;
  agentMessage: string;
  agentContext?: string[];
  options: OversightOption[];
  hint: string;
  careerInsight: string;
  skillTag: string;
};

export type PathwayId =
  | "help-desk"
  | "cybersecurity"
  | "full-stack"
  | "business-analyst"
  | "cloud-network";

export type PathwayPack = {
  pathwayId: PathwayId;
  pathwayName: string;
  agentPersona: string;
  roleBlurb: string;
  scenarios: Scenario[];
};

export type PathwayMeta = {
  id: PathwayId;
  name: string;
  tagline: string;
  accent: "green" | "violet";
};

export const PATHWAYS: PathwayMeta[] = [
  { id: "help-desk", name: "Help Desk Analyst", tagline: "Oversee an AI ticket-triage agent", accent: "green" },
  { id: "cybersecurity", name: "Cybersecurity Specialist", tagline: "Oversee an AI threat-detection agent", accent: "violet" },
  { id: "full-stack", name: "Full Stack Developer", tagline: "Oversee an AI coding agent", accent: "green" },
  { id: "business-analyst", name: "Business Analyst", tagline: "Oversee an AI reporting & analysis agent", accent: "violet" },
  { id: "cloud-network", name: "Cloud Network Specialist", tagline: "Oversee an AI cloud-ops agent", accent: "green" },
];

export type PlayerProfile = {
  playerId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ScenarioResult = {
  scenarioId: string;
  pathwayId: PathwayId;
  optionId: string;
  correct: boolean;
  usedHint: boolean;
  score: number;
};

export type PathwayRunResult = {
  pathwayId: PathwayId;
  score: number;
  maxScore: number;
  completedAt: string;
  results: ScenarioResult[];
};
