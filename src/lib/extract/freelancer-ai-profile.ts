import type { Json, TableInsert, TableRow } from "../../types/database";
import type { AggregatedSignals } from "../../services/cases";

import type { CaseExtractionResult } from "./schema";

function readStringArray(value: Json | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function getCaseExtractionFromFreelancerAIProfile(
  profile: TableRow<"freelancer_ai_profiles"> | null,
): CaseExtractionResult | null {
  if (!profile) {
    return null;
  }

  const result: CaseExtractionResult = {
    capabilities: readStringArray(profile.capabilities),
    industries: readStringArray(profile.industries),
    positioning: profile.summary ?? "",
    services: readStringArray(profile.expertise_tags),
    seniority: "Unknown",
  };

  if (
    !result.positioning &&
    result.capabilities.length === 0 &&
    result.industries.length === 0 &&
    result.services.length === 0
  ) {
    return null;
  }

  return result;
}

export function getFreelancerAIProfileUpsert(
  freelancerId: string,
  result: CaseExtractionResult,
  aggregatedSignals?: AggregatedSignals,
) {
  return {
    freelancer_id: freelancerId,
    summary: result.positioning || "",
    capabilities: result.capabilities,
    industries: result.industries,
    core_capabilities: aggregatedSignals?.coreCapabilities ?? [],
    extension_capabilities: aggregatedSignals?.extensionCapabilities ?? [],
    core_industries: aggregatedSignals?.coreIndustries ?? [],
    extension_industries: aggregatedSignals?.extensionIndustries ?? [],
    core_services: aggregatedSignals?.coreServices ?? [],
    extension_services: aggregatedSignals?.extensionServices ?? [],
    expertise_tags: result.services,
    updated_at: new Date().toISOString(),
  } satisfies TableInsert<"freelancer_ai_profiles">;
}
