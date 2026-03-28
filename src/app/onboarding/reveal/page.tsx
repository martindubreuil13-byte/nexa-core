import { getCaseExtractionFromFreelancerAIProfile } from "../../../lib/extract/freelancer-ai-profile";
import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getUserState } from "../../../lib/user/getUserState";
import { RevealPanel } from "./reveal-panel";

export default async function OnboardingRevealPage() {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { freelancer } = await getUserState();

  let initialResult = null;

  if (freelancer) {
    const { data: aiProfile, error: aiProfileError } = await supabase
      .from("freelancer_ai_profiles")
      .select("*")
      .eq("freelancer_id", freelancer.id)
      .maybeSingle();

    if (aiProfileError) {
      console.error("SUPABASE ERROR:", aiProfileError);
    }

    initialResult = getCaseExtractionFromFreelancerAIProfile(aiProfile);
  }

  return <RevealPanel initialResult={initialResult} />;
}
