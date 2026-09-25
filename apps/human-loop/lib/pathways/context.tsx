"use client";

/**
 * The pathway being played, for every game component. GameShell wraps its tree in
 * <PathwayProvider value={bundle}>. There is deliberately no default bundle: a component
 * outside the provider throws instead of silently bundling (and showing) the Help Desk.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { PathwayBundle } from "./types";

const PathwayContext = createContext<PathwayBundle | null>(null);

export function PathwayProvider({ value, children }: { value: PathwayBundle; children: ReactNode }) {
  return <PathwayContext.Provider value={value}>{children}</PathwayContext.Provider>;
}

export function usePathway(): PathwayBundle {
  const bundle = useContext(PathwayContext);
  if (!bundle) throw new Error("usePathway() needs a <PathwayProvider> (GameShell provides it).");
  return bundle;
}
