import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { TextInput } from "../../../components/ui/input";

export default function OnboardingProfilePage() {
  return (
    <div className="case-flow onboarding-profile">
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
