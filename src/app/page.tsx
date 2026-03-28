export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserState } from "../lib/user/getUserState";

export default async function HomePage() {
  try {
    const userState = await getUserState();

    if (userState.user) {
      redirect(userState.hasCases ? "/freelancer" : "/onboarding/case");
    }
  } catch (error) {
    console.error("SUPABASE ERROR:", error);
  }

  return (
    <section className="decision-gate">
      <div aria-hidden="true" className="decision-gate__atmosphere">
        <div className="decision-gate__wash" />
        <div className="decision-gate__shimmer" />
        <div className="decision-gate__orb decision-gate__orb--primary" />
        <div className="decision-gate__orb decision-gate__orb--secondary" />
        <div className="decision-gate__grain" />
      </div>

      <div className="decision-gate__inner">
        <div className="decision-gate__content">
          <h1 className="decision-gate__title">
            Not a
            <br />
            marketplace
          </h1>
          <p className="decision-gate__copy">
            Tell us what you&apos;re trying to solve.
            <br />
            We&apos;ll handle the rest.
          </p>
          <p className="decision-gate__tension">No search. No noise. No guessing.</p>
          <div className="decision-gate__actions">
            <Link className="decision-gate__cta" href="/intake">
              Start with your problem {"->"}
            </Link>
            <Link className="decision-gate__secondary-cta" href="/login">
              Join as an expert
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
