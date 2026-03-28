import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { requireUser } from "../../lib/auth/requireUser";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="case-flow">
      <section className="page-hero">
        <span className="eyebrow">Freelancer Onboarding</span>
        <h1 className="page-title">Start with a real case</h1>
        <p className="page-copy">
          Your workspace becomes useful as soon as NEXA has one real example of your work.
        </p>
      </section>

      <Card
        className="case-flow__panel"
        title="Begin here"
        description="Share one concrete project, engagement, or outcome you helped create."
      >
        <div className="button-row">
          <Button href="/onboarding/case">Go to case intake</Button>
        </div>
      </Card>
    </div>
  );
}
