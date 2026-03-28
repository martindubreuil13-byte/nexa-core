import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { TextInput } from "../../../../components/ui/input";
import { requireUser } from "../../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { getUserState } from "../../../../lib/user/getUserState";
import { getFreelancerCredentials } from "../../../../services/credentials";
import { uploadCredentialAction } from "./actions";

type CredentialsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function FreelancerCredentialsPage({ searchParams }: CredentialsPageProps) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const params = await searchParams;
  const { freelancer, hasCases } = await getUserState();

  const credentials =
    freelancer && hasCases
      ? await getFreelancerCredentials(supabase, freelancer.id).catch((error) => {
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
          description="Add one proof point at a time. Keep it simple and verifiable."
        >
          <form action={uploadCredentialAction} className="stack" encType="multipart/form-data">
            <TextInput
              autoComplete="off"
              id="credential-title"
              label="Title"
              name="title"
              placeholder="MBA"
              required
              disabled={!freelancer || !hasCases}
            />
            <TextInput
              autoComplete="organization"
              id="credential-organization"
              label="Issuing organization"
              name="issuingOrganization"
              placeholder="INSEAD"
              required
              disabled={!freelancer || !hasCases}
            />
            <TextInput
              id="credential-year"
              inputMode="numeric"
              label="Year"
              maxLength={4}
              name="year"
              placeholder="2024"
              required
              disabled={!freelancer || !hasCases}
            />
            <label className="field" htmlFor="credential-file">
              <span className="field__label">File</span>
              <input
                accept="application/pdf,image/*"
                className="field__input field__file-input"
                id="credential-file"
                name="file"
                required
                type="file"
                disabled={!freelancer || !hasCases}
              />
            </label>

            {params.error ? (
              <p className="auth-shell__message auth-shell__message--error">{params.error}</p>
            ) : null}
            {params.success ? <p className="notice">Credential uploaded successfully.</p> : null}
            {!freelancer || !hasCases ? (
              <div className="empty-state">
                Add your first case before uploading credentials.
              </div>
            ) : null}

            <div className="button-row">
              <Button type="submit" disabled={!freelancer || !hasCases}>
                Save credential
              </Button>
              <Button href="/freelancer" variant="secondary">
                Back to workspace
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Stored credentials"
          description="These credentials are visible as proof alongside your evolving identity."
        >
          {credentials.length > 0 ? (
            <div className="credential-list">
              {credentials.map((credential) => (
                <article className="credential-card" key={credential.id}>
                  <div className="credential-card__header">
                    <h3 className="credential-card__title">{credential.title}</h3>
                    {credential.year ? <span className="badge">{credential.year}</span> : null}
                  </div>
                  <p className="credential-card__copy">
                    {credential.issuingOrganization || "Issuing organization not provided"}
                  </p>
                  {credential.files.length > 0 ? (
                    <div className="credential-files">
                      {credential.files.map((file) => (
                        <a
                          className="credential-files__link"
                          href={file.publicUrl}
                          key={file.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {file.fileName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
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
