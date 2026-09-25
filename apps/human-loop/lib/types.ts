export type PathwayId =
  | "help-desk"
  | "cybersecurity"
  | "cloud-network"
  | "full-stack"
  | "business-analyst";

/** Pathways with (or getting) playable content: each has a bundle in lib/pathways/<id>. */
export type LivePathwayId = "help-desk" | "cybersecurity";

export type PathwayMeta = {
  id: PathwayId;
  name: string;
  /** The AI coworker the player supervises in this pathway. */
  agentName: string;
  tagline: string;
  status: "live" | "soon";
  /** Encounter id prefix ("hd"): generated shifts are `${idPrefix}-daily-7`, `${idPrefix}-drill-<skill>-2`. */
  idPrefix?: string;
  /** Sprite key of the agent; portraits are `${agentSprite}-<mood>.svg`. */
  agentSprite?: string;
  /** One line for the picker card before the first shift. */
  firstShift?: string;
  practiceId?: string;
  /** The fixed story shift ("hd-01-monday"). */
  storyId?: string;
  /** Its title ("Monday, 8:57 AM"), shown in Airtable's Encounter column. */
  storyTitle?: string;
  /** <title> and meta description of /play/<id>. */
  pageTitle?: string;
  pageDescription?: string;
};

export const PATHWAYS: PathwayMeta[] = [
  {
    id: "help-desk",
    name: "Help Desk",
    agentName: "Ollie",
    tagline: "Supervise an AI that thinks off-and-on-again fixes everything.",
    status: "live",
    idPrefix: "hd",
    agentSprite: "ollie",
    firstShift: "Your first shift: Monday morning at Fenwick IT Solutions. Four tickets. One very eager robot.",
    practiceId: "hd-00-practice",
    storyId: "hd-01-monday",
    storyTitle: "Monday, 8:57 AM",
    pageTitle: "Help Desk shift",
    pageDescription:
      "Supervise Ollie, an eager AI help desk agent. Read its plans, inspect the evidence, and stop the bad calls before they happen.",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    agentName: "Patch",
    tagline: "Supervise an AI that wants to quarantine everything, including the CEO.",
    // The integrator flips this to "live" once content/cybersecurity and lib/pathways/cybersecurity exist.
    status: "soon",
    idPrefix: "cy",
    agentSprite: "patch",
    firstShift: "Your first shift: Friday afternoon in Fenwick's security center. Four alerts. One very jumpy robot.",
    practiceId: "cy-00-practice",
    storyId: "cy-01-friday",
    storyTitle: "Friday, 4:47 PM",
    pageTitle: "Cybersecurity shift",
    pageDescription:
      "Supervise Patch, an over-eager AI security analyst. Read its plans, inspect the evidence, and stop the bad calls before they happen.",
  },
  {
    id: "cloud-network",
    name: "Cloud & Network",
    agentName: "Nimbus",
    tagline: "Supervise an AI with root access and a lot of confidence.",
    status: "soon",
  },
  {
    id: "full-stack",
    name: "Full-Stack Development",
    agentName: "Piper",
    tagline: "Supervise an AI that ships fast and reads docs never.",
    status: "soon",
  },
  {
    id: "business-analyst",
    name: "Business Analyst",
    agentName: "Quill",
    tagline: "Supervise an AI whose charts always go up and to the right.",
    status: "soon",
  },
];

export function getPathway(id: PathwayId): PathwayMeta {
  const p = PATHWAYS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown pathway ${id}`);
  return p;
}

/** Pathways players can open now (status "live"), in PATHWAYS order. */
export function livePathways(): PathwayMeta[] {
  return PATHWAYS.filter((p) => p.status === "live");
}

const LIVE_IDS: readonly string[] = ["help-desk", "cybersecurity"] satisfies LivePathwayId[];

/** A pathway id that has (or is getting) a content bundle. Says nothing about its status. */
export function isLivePathwayId(value: unknown): value is LivePathwayId {
  return typeof value === "string" && LIVE_IDS.includes(value);
}

/** The pathway an encounter id belongs to, by its prefix ("hd-daily-3" -> Help Desk). */
export function pathwayOfEncounterId(id: string): PathwayMeta | undefined {
  return PATHWAYS.find((p) => !!p.idPrefix && id.startsWith(`${p.idPrefix}-`));
}
