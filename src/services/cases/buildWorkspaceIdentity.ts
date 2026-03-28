import { synthesizeIdentity } from "./synthesizeIdentity";
import type { FreelancerCase } from "./getFreelancerCases";

export type WorkspaceIdentity = {
  coreCapabilities: string[];
  functionalSkills: string[];
  industries: string[];
  positioning: string;
  seniority: "Junior" | "Mid" | "Senior" | "Expert" | "Unknown";
  supportCopy: string;
};

export async function buildWorkspaceIdentity(
  cases: FreelancerCase[],
): Promise<WorkspaceIdentity> {
  if (cases.length === 0) {
    return {
      positioning: "We're still learning from your work.",
      coreCapabilities: [],
      functionalSkills: [],
      industries: [],
      seniority: "Unknown",
      supportCopy: "",
    };
  }

  if (cases.length === 1) {
    const identity = await synthesizeIdentity(cases);

    return {
      positioning: identity.positioning?.trim() || "We're still learning from your work.",
      coreCapabilities: identity.coreCapabilities ?? [],
      functionalSkills: identity.functionalSkills ?? [],
      industries: identity.industries ?? [],
      seniority: identity.seniority ?? "Unknown",
      supportCopy: "This is your first signal. Add 2-3 cases to reveal your core strengths.",
    };
  }

  const identity = await synthesizeIdentity(cases);

  return {
    positioning: identity.positioning?.trim() || "We're still learning from your work.",
    coreCapabilities: identity.coreCapabilities ?? [],
    functionalSkills: identity.functionalSkills ?? [],
    industries: identity.industries ?? [],
    seniority: identity.seniority ?? "Unknown",
    supportCopy: "Your identity is evolving as patterns emerge from your work.",
  };
}
