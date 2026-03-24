"use client";

import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";

export function IntakeForm() {
  const [challenge, setChallenge] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log(challenge);
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Textarea
        id="challenge"
        label="Challenge"
        name="challenge"
        placeholder="Explain what you're trying to achieve, what’s not working, or where you need help..."
        rows={8}
        value={challenge}
        onChange={(event) => setChallenge(event.target.value)}
      />
      <div className="button-row">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
