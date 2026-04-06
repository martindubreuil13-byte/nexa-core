import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { requireUser } from "../../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { getUserState } from "../../../../lib/user/getUserState";
import { getStoredCredentials } from "../../../../services/credentials";
import { CredentialUploadPanel } from "./credential-upload-panel";

export default async function FreelancerCredentialsPage() {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { freelancer, hasCases } = await getUserState();

  const credentials =
    freelancer && hasCases
      ? await getStoredCredentials(supabase, freelancer.user_id).catch((error) => {
          console.error("SUPABASE ERROR:", error);
          return [];
        })
      : [];

  return (
    <div className="page-stack">
      <section className="page-hero">
        <span className="eyebrow">Credentials &amp; Proof</span>
        <h1 className="page-title">Add trust signals to your identity</h1>
        <p className="page-copy">
          Credentials sit alongside your real work to strengthen how clients evaluate your profile.
        </p>
      </section>

      <section className="grid grid--two">
        <Card
          className="case-flow__panel"
          title="Upload a credential"
          description="Drop in a document, review what the system extracts, and save only when it looks right."
        >
          {!freelancer || !hasCases ? (
            <div className="empty-state">
              Add your first case before uploading credentials.
            </div>
          ) : null}
          <CredentialUploadPanel disabled={!freelancer || !hasCases} />
          <div className="button-row">
            <Button href="/freelancer" variant="secondary">
              Back to workspace
            </Button>
          </div>
        </Card>

        <Card
          title="Stored credentials"
          description="These credentials are visible as proof alongside your evolving identity."
        >
          {credentials.length > 0 ? (
            <div className="credential-list">
              {credentials.map((credential) => {
                const reasons = Array.isArray(credential.confidenceReason)
                  ? credential.confidenceReason
                  : [];
                const flags = Array.isArray(credential.flags) ? credential.flags : [];
                const summary =
                  typeof credential.aiSummary === "string" && credential.aiSummary.trim().length > 0
                    ? credential.aiSummary
                    : "No summary available";

                console.log("credential normalized", {
                  id: credential.id,
                  confidenceReason: reasons,
                  flags,
                  summary,
                });

                return (
                  <article className="credential-card" key={credential.id}>
                    <div className="credential-card__header">
                      <h3 className="credential-card__title">{credential.title}</h3>
                      {credential.confidenceLevel ? (
                        <span className="badge">{credential.confidenceLevel}</span>
                      ) : null}
                    </div>
                    <p className="credential-card__copy">
                      {credential.issuer || "Issuer not provided"}
                    </p>
                    {credential.issueDate ? (
                      <p className="credential-card__meta">Issued {credential.issueDate}</p>
                    ) : null}
                    <p className="credential-card__meta">AI-validated</p>
                    <p className="credential-card__summary">{summary}</p>
                    <ul className="credential-review__list credential-review__list--checks">
                      {(reasons.length > 0 ? reasons : ["Document structure partially recognized"])
                        .slice(0, 2)
                        .map((reason) => (
                          <li key={reason}>
                            <span className="credential-review__check">✔</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                    </ul>
                    {flags.length > 0 ? (
                      <ul className="credential-review__list">
                        {flags.slice(0, 2).map((flag) => (
                          <li key={flag}>
                            <span className="credential-review__warning">⚠</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              No credentials yet. Add a certificate, degree, or other proof to strengthen trust.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
