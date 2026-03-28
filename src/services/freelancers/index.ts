import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";
import { getFreelancerCases, type FreelancerCase } from "../cases";

export type FreelancerWorkspace = {
  cases: FreelancerCase[];
  freelancer: TableRow<"freelancers"> | null;
};

export async function getFreelancerByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TableRow<"freelancers"> | null> {
  const { data, error } = await supabase
    .from("freelancers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCreateFreelancerByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TableRow<"freelancers">> {
  const existingFreelancer = await getFreelancerByUserId(supabase, userId);

  if (existingFreelancer) {
    return existingFreelancer;
  }

  const { data, error } = await supabase
    .from("freelancers")
    .insert({
      user_id: userId,
      created_at: new Date().toISOString(),
    } as never)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as TableRow<"freelancers">;
}

export async function getFreelancerWorkspace(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FreelancerWorkspace> {
  const freelancer = await getFreelancerByUserId(supabase, userId);

  if (!freelancer) {
    return {
      freelancer: null,
      cases: [],
    };
  }

  return {
    freelancer,
    cases: await getFreelancerCases(supabase, freelancer.id),
  };
}

export { syncFreelancerIdentity } from "./syncFreelancerIdentity";
