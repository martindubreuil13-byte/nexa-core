"use client";

import { useFormStatus } from "react-dom";

import { Button } from "../../../components/ui/button";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}
