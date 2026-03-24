import Link from "next/link";

import { AuthFormShell } from "../../../components/forms/auth-form-shell";
import { redirectIfAuthenticated } from "../../../lib/auth/redirectIfAuthenticated";
import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  await redirectIfAuthenticated();

  const params = searchParams ? await searchParams : undefined;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  return (
    <AuthFormShell
      eyebrow="NEXA"
      title="Create account"
      description="Set up your access in a few details."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent-strong)" }}>
            Sign in
          </Link>
          .
        </>
      }
    >
      <SignupForm error={error} />
    </AuthFormShell>
  );
}
