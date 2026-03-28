import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, TableRow } from "../../types/database";

export type FreelancerCase = {
  capabilities: string[];
  createdAt: string;
  freelancerId: string;
  id: string;
  industries: string[];
  positioning: string;
  rawText: string | null;
  seniority: "Junior" | "Mid" | "Senior" | "Expert" | "Unknown";
  services: string[];
};

function readStringArray(value: Json | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getFreelancerCases(
  supabase: SupabaseClient<Database>,
  freelancerId: string,
): Promise<FreelancerCase[]> {
  const { data, error } = await supabase
    .from("freelancer_cases")
    .select("*")
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const freelancerCases = (data ?? []) as Array<TableRow<"freelancer_cases">>;

  return freelancerCases.map((freelancerCase) => ({
    id: freelancerCase.id,
    freelancerId: freelancerCase.freelancer_id,
    rawText: freelancerCase.raw_text ?? null,
    positioning: freelancerCase.positioning ?? "",
    capabilities: readStringArray(freelancerCase.capabilities),
    industries: readStringArray(freelancerCase.industries),
    seniority: freelancerCase.seniority ?? "Unknown",
    services: readStringArray(freelancerCase.services),
    createdAt: freelancerCase.created_at,
  }));
}
