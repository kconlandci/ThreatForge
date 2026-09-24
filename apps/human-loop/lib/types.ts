export type PathwayId =
  | "help-desk"
  | "cybersecurity"
  | "cloud-network"
  | "full-stack"
  | "business-analyst";

export type PathwayMeta = {
  id: PathwayId;
  name: string;
  /** The AI coworker the player supervises in this pathway. */
  agentName: string;
  tagline: string;
  status: "live" | "soon";
};

export const PATHWAYS: PathwayMeta[] = [
  {
    id: "help-desk",
    name: "Help Desk",
    agentName: "ResetBot 3000",
    tagline: "Supervise an AI that really, really loves resetting passwords.",
    status: "live",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    agentName: "Warden",
    tagline: "Supervise an AI that wants to quarantine everything, including the CEO.",
    status: "soon",
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
