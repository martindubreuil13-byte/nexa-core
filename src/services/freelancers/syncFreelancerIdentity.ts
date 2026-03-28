import type { SupabaseClient } from "@supabase/supabase-js";

import { getDisplayPositioning } from "../../lib/extract/getDisplayPositioning";
import { getFreelancerAIProfileUpsert } from "../../lib/extract/freelancer-ai-profile";
import { generatePositioning } from "../../lib/extract/generatePositioning";
import type { CaseExtractionResult } from "../../lib/extract/schema";
import type { Database } from "../../types/database";
import { aggregateSignals, getFreelancerCases, type AggregatedSignals, type FreelancerCase } from "../cases";

type SyncedFreelancerIdentity = {
  aggregatedSignals: AggregatedSignals | null;
  cases: FreelancerCase[];
  result: CaseExtractionResult | null;
};

function getIdentityInputs(aggregatedSignals: AggregatedSignals) {
  return {
    capabilities:
      aggregatedSignals.coreCapabilities.length > 0
        ? aggregatedSignals.coreCapabilities.map((signal) => signal.name)
        : aggregatedSignals.capabilities.map((signal) => signal.name),
    extensionCapabilities: aggregatedSignals.extensionCapabilities.map((signal) => signal.name),
    industries:
      aggregatedSignals.coreIndustries.length > 0
        ? aggregatedSignals.coreIndustries.map((signal) => signal.name)
        : aggregatedSignals.industries.map((signal) => signal.name),
    services:
      aggregatedSignals.coreServices.length > 0
        ? aggregatedSignals.coreServices.map((signal) => signal.name)
        : aggregatedSignals.services.map((signal) => signal.name),
  };
}

export async function syncFreelancerIdentity(
  supabase: SupabaseClient<Database>,
  freelancerId: string,
  liveResult?: CaseExtractionResult | null,
): Promise<SyncedFreelancerIdentity> {
  const cases = await getFreelancerCases(supabase, freelancerId);

  if (cases.length === 0) {
    const { error } = await supabase.from("freelancer_ai_profiles").delete().eq("freelancer_id", freelancerId);

    if (error) {
      throw error;
    }

    return {
      cases,
      aggregatedSignals: null,
      result: null,
    };
  }

  const aggregatedSignals = aggregateSignals(cases);
  const identityInputs = getIdentityInputs(aggregatedSignals);
  const aggregatedPositioning = getDisplayPositioning(
    generatePositioning({
      coreCapabilities: identityInputs.capabilities.slice(0, 3),
      extensionCapabilities: identityInputs.extensionCapabilities.slice(0, 1),
      industries: identityInputs.industries.slice(0, 2),
      services: identityInputs.services.slice(0, 2),
    }),
  );
  const positioning =
    cases.length >= 2
      ? aggregatedPositioning
      : getDisplayPositioning(liveResult?.positioning) || aggregatedPositioning;

  const result: CaseExtractionResult = {
    positioning,
    capabilities: aggregatedSignals.capabilities.map((signal) => signal.name),
    industries: aggregatedSignals.industries.map((signal) => signal.name),
    services: aggregatedSignals.services.map((signal) => signal.name),
    seniority: "Unknown",
  };

  const { error } = await supabase
    .from("freelancer_ai_profiles")
    .upsert(getFreelancerAIProfileUpsert(freelancerId, result, aggregatedSignals) as never, {
      onConflict: "freelancer_id",
    });

  if (error) {
    throw error;
  }

  return {
    cases,
    aggregatedSignals,
    result,
  };
}
