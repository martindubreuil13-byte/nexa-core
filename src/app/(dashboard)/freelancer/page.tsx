export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore } from "next/cache";
import { Card } from "../../../components/ui/card";
import { requireUser } from "../../../lib/auth/requireUser";

export default async function FreelancerDashboardPage() {
  const user = await requireUser();
  unstable_noStore();

  return (
    <div className="page-stack">
      <section className="page-hero">
        <span className="eyebrow">Freelancer Dashboard</span>
        <h1 className="page-title">Your workspace</h1>
        <p className="page-copy">Your workspace will appear here as you build your profile.</p>
      </section>

      <section className="grid grid--two">
        <Card
          title="Authenticated session"
          description="This page is protected on the server before any UI renders."
        >
          <div className="meta-list">
            <div className="meta-row">
              <span className="meta-row__label">User ID</span>
              <span>{user.id}</span>
            </div>
            <div className="meta-row">
              <span className="meta-row__label">Email</span>
              <span>{user.email ?? "No email available"}</span>
            </div>
          </div>
        </Card>

        <Card
          title="Planned modules"
          description="The UI is ready for future composition without leaking Supabase concerns into components."
        >
          <div className="empty-state">
            Profile completion, routed opportunities, proposal workflows, and AI-assisted profile
            intelligence belong in `services/` and reusable UI primitives, not directly in routes.
          </div>
        </Card>
      </section>
    </div>
  );
}
