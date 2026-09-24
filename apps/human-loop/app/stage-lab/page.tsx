import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StageLab from "@/components/game/stage/StageLab";

export const metadata: Metadata = {
  title: "Stage lab (dev)",
  robots: { index: false, follow: false },
};

/** Dev-only harness for the Phaser stage. */
export default function StageLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StageLab />;
}
