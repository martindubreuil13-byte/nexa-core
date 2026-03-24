export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore } from "next/cache";
import { Card } from "../../../components/ui/card";
import { requireUser } from "../../../lib/auth/requireUser";

export default async function BusinessDashboardPage() {
  const user = await requireUser();
  unstable_noStore();

  return (
    <div className="page-stack">
      <section className="page-hero">
        <span className="eyebrow">Business Dashboard</span>
        <h1 className="page-title">Business workspace shell</h1>
        <p className="page-copy">
          This route is intentionally free of domain logic. It is ready for future server-side
          composition through services, route handlers, and server actions.
        </p>
      </section>

      <section className="grid grid--two">
        <Card
          title="Authenticated session"
          description="Server-side authentication is enforced before rendering this page."
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
          description="Each concern should be wired in through services and dedicated UI components."
        >
          <div className="empty-state">
            Business brief creation, RFP management, escrow flows, and proposal review will plug
            into the matching and profiles services from here.
          </div>
        </Card>
      </section>
    </div>
  );
}
