import Link from "next/link";

import { AuthFormShell } from "../../../components/forms/auth-form-shell";
import { redirectIfAuthenticated } from "../../../lib/auth/redirectIfAuthenticated";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated();

  const params = searchParams ? await searchParams : undefined;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  return (
    <AuthFormShell
      eyebrow="NEXA"
      title="Welcome back"
      description="Sign in to continue."
      footer={
        <>
          Need an account?{" "}
          <Link href="/signup" style={{ color: "var(--accent-strong)" }}>
            Create one
          </Link>
          .
        </>
      }
    >
      <LoginForm error={error} />
    </AuthFormShell>
  );
}
