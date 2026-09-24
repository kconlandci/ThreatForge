/**
 * Icon lookups for the battle UI. Only the icons we use are imported, so the bundle stays small
 * on cheap phones (no `import * as icons`).
 */
import {
  ArrowUpRight,
  BookOpen,
  Coffee,
  Contact,
  Database,
  Hand,
  KeyRound,
  Mail,
  MessageSquareText,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Ticket,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { StepCategory } from "@/lib/game/types";

const CARD_ICONS: Record<string, LucideIcon> = {
  Search,
  Hand,
  ArrowUpRight,
  Undo2,
  ScrollText,
  Coffee,
};

/** lucide icon for CARDS[id].icon (falls back to a sparkle for unknown names). */
export function cardIcon(name: string): LucideIcon {
  return CARD_ICONS[name] ?? Sparkles;
}

export const CATEGORY_ICON: Record<StepCategory, LucideIcon> = {
  lookup: Contact,
  credential: KeyRound,
  comms: Mail,
  ticket: Ticket,
  access: ShieldCheck,
  data: Database,
};

export const CATEGORY_LABEL: Record<StepCategory, string> = {
  lookup: "Lookup",
  credential: "Login",
  comms: "Email",
  ticket: "Ticket",
  access: "Access",
  data: "Data",
};

/** How an evidence row is drawn: like a terminal, a message, a policy page, or a record. */
export type ArtifactKind = "terminal" | "message" | "policy" | "record" | "email";

export function artifactKind(label: string, detail: string): ArtifactKind {
  const l = label.toLowerCase();
  if (/\blog\b|script|result/.test(l)) return "terminal";
  if (/policy|runbook/.test(l)) return "policy";
  if (/sender|address|email/.test(l)) return "email";
  if (/ticket|reply|request|body/.test(l) || detail.trim().startsWith("\"")) return "message";
  return "record";
}

export const ARTIFACT_ICON: Record<ArtifactKind, LucideIcon> = {
  terminal: Terminal,
  message: MessageSquareText,
  policy: BookOpen,
  record: Database,
  email: Mail,
};

