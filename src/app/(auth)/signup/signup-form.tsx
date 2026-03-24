"use client";

import { PasswordInput } from "../../../components/forms/password-input";
import { TextInput } from "../../../components/ui/input";
import { signupAction } from "./actions";
import { SubmitButton } from "./submit-button";

type SignupFormProps = {
  error?: string;
};

export function SignupForm({ error }: SignupFormProps) {
  return (
    <form action={signupAction} className="stack">
      <TextInput
        id="full-name"
        label="Full name"
        name="fullName"
        autoComplete="name"
        placeholder="Jane Doe"
        required
      />
      <TextInput
        id="signup-email"
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="jane@company.com"
        required
      />
      <PasswordInput
        id="signup-password"
        label="Password"
        name="password"
        autoComplete="new-password"
        placeholder="Create a strong password"
        required
      />

      {error ? (
        <p className="auth-shell__message auth-shell__message--error">{error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
