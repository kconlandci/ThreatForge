// Renderer registry — maps RendererType to component
import type { RendererType } from "../../types/manifest";
import type { RendererProps } from "../LabEngine";
import ActionRationaleRenderer from "./ActionRationaleRenderer";
import ToggleConfigRenderer from "./ToggleConfigRenderer";
import InvestigateDecideRenderer from "./InvestigateDecideRenderer";
import TriageRemediateRenderer from "./TriageRemediateRenderer";

export const RENDERERS: Record<RendererType, React.ComponentType<RendererProps>> = {
  "action-rationale": ActionRationaleRenderer,
  "toggle-config": ToggleConfigRenderer,
  "investigate-decide": InvestigateDecideRenderer,
  "triage-remediate": TriageRemediateRenderer,
};
