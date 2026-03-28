import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { requireUser } from "../../../lib/auth/requireUser";

export default async function OnboardingWelcomePage() {
  await requireUser();

  return (
    <div className="case-flow">
      <section className="page-hero">
        <span className="eyebrow">Freelancer Onboarding</span>
        <h1 className="page-title">NEXA builds your profile from real work, not keywords</h1>
        <p className="page-copy">
          Tell us about what you&apos;ve actually done. The more real cases you share, the sharper
          your positioning and matching become.
        </p>
      </section>

      <Card
        className="case-flow__panel"
        title="Start with lived experience"
        description="We begin by understanding the work behind your profile, then turn that into an evolving identity."
      >
        <div className="button-row">
          <Button href="/onboarding/case">Start with your first case</Button>
        </div>
      </Card>
    </div>
  );
}
