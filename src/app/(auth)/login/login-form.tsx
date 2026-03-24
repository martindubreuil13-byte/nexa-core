"use client";

import { useFormStatus } from "react-dom";

import { TextInput } from "../../../components/ui/input";
import { PasswordInput } from "../../../components/forms/password-input";
import { loginAction } from "./actions";

type LoginFormProps = {
  error?: string;
};

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--primary" disabled={pending} type="submit">
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm({ error }: LoginFormProps) {
  return (
    <form action={loginAction} className="stack">
      <TextInput
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        required
      />
      <PasswordInput
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
      />

      {error ? (
        <p className="auth-shell__message auth-shell__message--error">{error}</p>
      ) : null}

      <div className="button-row auth-shell__actions">
        <LoginSubmitButton />
        <button className="auth-shell__text-action" type="button">
          Forgot password
        </button>
      </div>
    </form>
  );
}
