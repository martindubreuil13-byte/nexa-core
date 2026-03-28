import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { TextInput } from "../../../components/ui/input";
import { getCaseExtractionFromFreelancerAIProfile } from "../../../lib/extract/freelancer-ai-profile";
import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function OnboardingProfilePage() {
  const authUser = await requireUser();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("SUPABASE ERROR:", userError);
  }

  const activeUser = user ?? authUser;
  const { data: freelancerData, error: freelancerError } = await supabase
    .from("freelancers")
    .select("*")
    .eq("user_id", activeUser.id)
    .single();
  const freelancer = freelancerData as { id: string } | null;

  if (freelancerError || !freelancer) {
    console.error("SUPABASE ERROR:", freelancerError);
    console.error("Freelancer lookup failed:", freelancerError);
  }

  let storedExtraction = null;

  if (freelancer) {
    const { data: aiProfile, error: aiProfileError } = await supabase
      .from("freelancer_ai_profiles")
      .select("*")
      .eq("freelancer_id", freelancer.id)
      .maybeSingle();

    if (aiProfileError) {
      console.error("SUPABASE ERROR:", aiProfileError);
    }

    storedExtraction = getCaseExtractionFromFreelancerAIProfile(aiProfile);
  }

  return (
    <div className="case-flow onboarding-profile">
      {storedExtraction ? (
        <Card
          className="case-flow__panel case-flow__result onboarding-profile__snapshot"
          title="Profile intelligence"
          description="Your latest extracted positioning stays visible while you complete your profile."
        >
          {storedExtraction.positioning ? (
            <div className="case-flow__positioning">
              <span className="case-flow__label">NEXA understands you as:</span>
              <p className="case-flow__positioning-copy">{storedExtraction.positioning}</p>
            </div>
          ) : null}

          {storedExtraction.capabilities.length > 0 ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Capabilities</span>
              <div className="case-flow__tags">
                {storedExtraction.capabilities.map((item) => (
                  <span className="badge" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {storedExtraction.industries.length > 0 ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Industries</span>
              <div className="case-flow__tags">
                {storedExtraction.industries.map((item) => (
                  <span className="badge" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {storedExtraction.services.length > 0 ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Services</span>
              <ul className="case-flow__services">
                {storedExtraction.services.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="case-flow__section">
            <span className="case-flow__label">Seniority</span>
            <span className="badge case-flow__badge">{storedExtraction.seniority}</span>
          </div>
        </Card>
      ) : null}

      <Card
        className="case-flow__panel onboarding-profile__panel"
        title="Identity"
        description="A few essentials to shape your profile."
      >
        <form className="stack">
          <TextInput
            id="profile-full-name"
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="Jane Doe"
          />
          <TextInput
            id="profile-country"
            label="Country"
            name="country"
            autoComplete="country-name"
            placeholder="Thailand"
          />
          <TextInput
            id="profile-timezone"
            label="Timezone"
            name="timezone"
            placeholder="Asia/Bangkok"
          />
          <TextInput
            id="profile-language"
            label="Language"
            name="language"
            autoComplete="language"
            placeholder="English"
          />

          <div className="button-row onboarding-profile__actions">
            <Button type="button">Continue</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
