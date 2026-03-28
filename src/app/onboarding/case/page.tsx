import { CaseExtractionFlow } from "./case-extraction-flow";
import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import type { CaseExtractionResult } from "../../../lib/extract/schema";
import type { TableRow } from "../../../types/database";

type OnboardingCasePageProps = {
  searchParams?: Promise<{
    caseId?: string;
  }>;
};

export default async function OnboardingCasePage({ searchParams }: OnboardingCasePageProps) {
  const authUser = await requireUser();
  const supabase = await createServerSupabaseClient();
  const params = searchParams ? await searchParams : undefined;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("SUPABASE ERROR:", userError);
  }

  const activeUser = user ?? authUser;
  const caseId = typeof params?.caseId === "string" && params.caseId.trim() ? params.caseId.trim() : null;
  const { count: caseCount, error: casesCountError } = await supabase
    .from("freelancer_cases")
    .select("id", { count: "exact", head: true })
    .eq("freelancer_id", activeUser.id);

  if (casesCountError) {
    console.error("SUPABASE ERROR:", casesCountError);
  }

  let initialResult: CaseExtractionResult | null = null;
  let initialText = "";

  if (caseId) {
    const { data: freelancerCaseData, error: freelancerCaseError } = await supabase
      .from("freelancer_cases")
      .select("*")
      .eq("id", caseId)
      .eq("freelancer_id", activeUser.id)
      .maybeSingle();

    if (freelancerCaseError) {
      console.error("SUPABASE ERROR:", freelancerCaseError);
    }

    const freelancerCase = freelancerCaseData as TableRow<"freelancer_cases"> | null;

    if (freelancerCase) {
      initialText = freelancerCase.raw_text;
      initialResult = null;
    }
  }

  return (
    <div className="onboarding-stage">
      <section className="onboarding-stage__hero">
        <span className="onboarding-stage__eyebrow">NEXA onboarding</span>
        <h1 className="onboarding-stage__title">Welcome to NEXA</h1>
        <div className="onboarding-stage__copy">
          <p>
            This isn&apos;t a freelance platform.
            <br />
            We don&apos;t match keywords.
          </p>
          <p>We connect real capabilities with real problems.</p>
        </div>
        <p className="onboarding-stage__transition">
          To do that, we need to understand how you actually work.
        </p>
        <p className="onboarding-stage__prompt">Start with one thing you&apos;ve done.</p>
      </section>

      <div className="onboarding-stage__flow">
        <CaseExtractionFlow
          initialCaseCount={caseCount ?? 0}
          initialCaseId={caseId}
          initialResult={initialResult}
          initialText={initialText}
        />
      </div>
    </div>
  );
}
