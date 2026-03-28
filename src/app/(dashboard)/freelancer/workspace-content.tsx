"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../../components/ui/button";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import type { FreelancerCase, WorkspaceIdentity } from "../../../services/cases";
import { CaseItemActions } from "./case-item-actions";

type WorkspaceContentProps = {
  initialCases: FreelancerCase[];
  initialIdentity: WorkspaceIdentity;
};

function getCasePreview(rawText: string | null | undefined) {
  const safeText = rawText ?? "";
  const normalizedText = safeText.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "No description available";
  }

  return normalizedText.length > 140 ? `${normalizedText.slice(0, 137)}...` : normalizedText;
}

function getCaseTitle(rawText: string | null | undefined) {
  const safeText = rawText ?? "";
  const normalizedText = safeText.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "No description available";
  }

  const firstSentence = normalizedText.match(/^(.+?[.!?])(?:\s|$)/u)?.[1]?.trim();
  const title = firstSentence && firstSentence.length <= 100 ? firstSentence : normalizedText.slice(0, 100).trim();

  return title || "No description available";
}

type DeleteResultPayload = {
  cases: FreelancerCase[];
  identity: WorkspaceIdentity;
  notice?: string;
};

export function WorkspaceContent({
  initialCases,
  initialIdentity,
}: WorkspaceContentProps) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [identity, setIdentity] = useState(initialIdentity);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUpdating, startTransition] = useTransition();

  function handleCaseDeleted(result: DeleteResultPayload) {
    startTransition(() => {
      setCases(result.cases);
      setIdentity(result.identity);
      setNotice(result.notice ?? "Case removed. Your profile has been updated.");
    });
  }

  function handleResetProfile() {
    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("freelancer_cases")
        .delete()
        .eq("freelancer_id", user.id);

      if (error) {
        window.alert(error.message);
        return;
      }

      setCases([]);
      setIdentity({
        positioning: "",
        coreCapabilities: [],
        functionalSkills: [],
        industries: [],
        seniority: "Unknown",
        supportCopy: "",
      });
      router.push("/onboarding/case");
      router.refresh();
    });
  }

  const safeCases = (cases || []).map((freelancerCase) => ({
    ...freelancerCase,
    rawText: freelancerCase.rawText ?? "",
    capabilities: freelancerCase.capabilities ?? [],
    industries: freelancerCase.industries ?? [],
  }));
  const safePositioning = identity.positioning?.trim() || "We're building your identity. Add more cases.";
  const stateSupportCopy =
    safeCases.length === 1
      ? "You’ve started defining how you work. This is based on one example. Add 2–3 more to reveal your real pattern."
      : "Your identity is evolving as patterns emerge from your work.";

  if (safeCases.length === 0) {
    return (
      <section className="workspace-empty">
        <div aria-hidden="true" className="workspace-empty__glow" />
        <span className="workspace-section__eyebrow">Welcome to NEXA</span>
        <h1 className="workspace-empty__title">Welcome to NEXA</h1>
        <p className="workspace-empty__copy">
          This isn&apos;t a freelance platform. We connect real capabilities with real problems.
        </p>
        <div className="button-row">
          <Button href="/onboarding/case">+ Add your first case</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="identity-workspace">
      <section className="workspace-hero">
        <div aria-hidden="true" className="workspace-hero__glow" />
        <div className="workspace-hero__content">
          <span className="workspace-hero__eyebrow">NEXA understands you as</span>
          <h1 className="workspace-hero__title">{safePositioning}</h1>
          <p className="workspace-hero__support">
            {safeCases.length >= 2 ? stateSupportCopy : stateSupportCopy}
          </p>
          {identity.seniority !== "Unknown" ? (
            <div className="workspace-hero__meta">
              <span className="identity-chip identity-chip--soft">{identity.seniority}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="workspace-panel workspace-panel--wide workspace-signal-groups">
        <div className="workspace-signal-group">
          <span className="workspace-signal-group__label">Core strengths</span>
          {identity.coreCapabilities.length > 0 ? (
            <div className="workspace-chip-set workspace-chip-set--left">
              {identity.coreCapabilities.map((item) => (
                <span className="identity-chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="workspace-section__empty">Still taking shape.</p>
          )}
        </div>

        <div className="workspace-signal-group">
          <span className="workspace-signal-group__label">Execution skills</span>
          {identity.functionalSkills.length > 0 ? (
            <div className="workspace-chip-set workspace-chip-set--left">
              {identity.functionalSkills.map((item) => (
                <span className="identity-chip identity-chip--soft" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="workspace-section__empty">No execution skills surfaced yet.</p>
          )}
        </div>

        <div className="workspace-signal-group">
          <span className="workspace-signal-group__label">Industries</span>
          {identity.industries.length > 0 ? (
            <div className="workspace-chip-set workspace-chip-set--left">
              {identity.industries.map((item) => (
                <span className="identity-chip identity-chip--soft" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="workspace-section__empty">No industries identified yet.</p>
          )}
        </div>
      </section>

      <section className="workspace-panel workspace-panel--wide">
        <div className="workspace-section__header">
          <span className="workspace-section__eyebrow">Your work</span>
          {notice ? <p className="notice">{notice}</p> : null}
        </div>

        <div className="workspace-case-list">
          {safeCases.map((freelancerCase, index) => (
            <article className="workspace-case" key={freelancerCase.id}>
              <div className="workspace-case__meta">
                <div className="workspace-case__heading">
                  <span className="workspace-case__label">Case {index + 1}</span>
                  <h2 className="workspace-case__title">{getCaseTitle(freelancerCase.rawText)}</h2>
                </div>
                <span className="workspace-case__date">
                  {new Date(freelancerCase.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="workspace-case__copy">{getCasePreview(freelancerCase.rawText)}</p>
              <CaseItemActions
                caseId={freelancerCase.id}
                disabled={isUpdating}
                onCaseDeleted={handleCaseDeleted}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-panel workspace-panel--wide workspace-cta">
        <div className="button-row">
          <Button className="workspace-add-case" href="/onboarding/case" variant="secondary">
            + Add another case
          </Button>
          <Button disabled={isUpdating} onClick={handleResetProfile} variant="ghost">
            {isUpdating ? "Resetting..." : "Reset profile"}
          </Button>
        </div>
      </section>
    </div>
  );
}
