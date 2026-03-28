import "server-only";

import { unstable_noStore } from "next/cache";
import type { User } from "@supabase/supabase-js";

import type { TableRow } from "../../types/database";
import { createServerSupabaseClient } from "../supabase/server";

export type UserState = {
  caseCount: number;
  freelancer: TableRow<"freelancers"> | null;
  hasCases: boolean;
  user: User | null;
};

export async function getUserState(userId?: string): Promise<UserState> {
  unstable_noStore();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const targetUserId = userId ?? authUser?.id;

  if (!authUser || !targetUserId) {
    return {
      caseCount: 0,
      user: null,
      freelancer: null,
      hasCases: false,
    };
  }

  const { data: cases } = await supabase
    .from("freelancer_cases")
    .select("*")
    .eq("freelancer_id", targetUserId)
    .throwOnError();

  const caseCount = cases?.length ?? 0;

  const { data: freelancerData, error: freelancerError } = await supabase
    .from("freelancers")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (freelancerError) {
    throw freelancerError;
  }

  const freelancer = freelancerData as TableRow<"freelancers"> | null;

  console.log("USER STATE:", {
    userId: targetUserId,
    caseCount,
  });

  return {
    caseCount,
    user: authUser,
    freelancer,
    hasCases: caseCount > 0,
  };
}
