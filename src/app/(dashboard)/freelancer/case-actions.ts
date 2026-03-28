"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import {
  buildWorkspaceIdentity,
  getFreelancerCases,
  type FreelancerCase,
  type WorkspaceIdentity,
} from "../../../services/cases";

type CaseActionResult = {
  cases?: FreelancerCase[];
  error?: string;
  identity?: WorkspaceIdentity;
  notice?: string;
  success: boolean;
};

export async function deleteFreelancerCaseAction(caseId: string): Promise<CaseActionResult> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  try {
    const { error: deleteError } = await supabase
      .from("freelancer_cases")
      .delete()
      .eq("id", caseId)
      .eq("freelancer_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    const updatedCases = await getFreelancerCases(supabase, user.id);
    const updatedIdentity = await buildWorkspaceIdentity(updatedCases);

    revalidatePath("/freelancer");
    revalidatePath("/onboarding/case");

    return {
      success: true,
      cases: updatedCases,
      identity: updatedIdentity,
      notice: "Case removed. Your profile has been updated.",
    };
  } catch (error) {
    console.error("CASE DELETE FAILED", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete case.",
    };
  }
}
