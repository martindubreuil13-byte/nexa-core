import { Card } from "../../components/ui/card";
import { IntakeForm } from "./intake-form";

export default function IntakePage() {
  return (
    <div className="intake-shell">
      <Card
        className="intake-card"
        title="What’s the challenge?"
        description="Describe your situation. We’ll help you structure it."
      >
        <IntakeForm />
      </Card>
    </div>
  );
}
