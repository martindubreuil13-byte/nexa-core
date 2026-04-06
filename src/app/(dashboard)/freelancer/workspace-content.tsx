"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../../components/ui/button";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import type { FreelancerCase, WorkspaceIdentity } from "../../../services/cases";
import type { StoredCredential } from "../../../services/credentials";
import { CaseItemActions } from "./case-item-actions";

type WorkspaceContentProps = {
  initialCases: FreelancerCase[];
  initialCredentials: StoredCredential[];
  initialIdentity: WorkspaceIdentity;
};

type DeleteResultPayload = {
  cases: FreelancerCase[];
  identity: WorkspaceIdentity;
  notice?: string;
};

const MAX_VISIBLE_TAGS = 5;

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

function getCredentialWeight(type: string | null) {
  const normalizedType = (type ?? "").toLowerCase();

  if (normalizedType.includes("degree")) {
    return 20;
  }

  if (
    normalizedType.includes("certification") ||
    normalizedType.includes("certificate") ||
    normalizedType.includes("license")
  ) {
    return 10;
  }

  return 5;
}

function getProfileStrength(caseCount: number, credentials: StoredCredential[]) {
  const credentialWeight = credentials.reduce(
    (total, credential) => total + getCredentialWeight(credential.type),
    0,
  );

  return Math.min(100, 24 + caseCount * 14 + credentialWeight);
}

function refinePositioning(positioning: string) {
  const trimmed = positioning.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return "We're still learning from your work.";
  }

  const tuned = trimmed
    .replace(/^Structures\b/i, "Turns")
    .replace(/\bexecutable business models\b/gi, "structured, executable businesses")
    .replace(/\bbusiness models\b/gi, "businesses")
    .replace(/\bstructured execution\b/gi, "structured outcomes")
    .replace(/\s+([,.!?])/g, "$1");

  return tuned.split(" ").slice(0, 10).join(" ").trim();
}

function sortTags(values: string[]) {
  return [...values].sort((left, right) => {
    if (left.length !== right.length) {
      return left.length - right.length;
    }

    return left.localeCompare(right, "en-US", { sensitivity: "base" });
  });
}

type TagGroupProps = {
  emptyCopy: string;
  expanded: boolean;
  items: string[];
  label: string;
  onToggle: () => void;
  soft?: boolean;
};

function TagGroup({ emptyCopy, expanded, items, label, onToggle, soft = false }: TagGroupProps) {
  const sortedItems = sortTags(items).slice(0, 12);
  const visibleItems = expanded ? sortedItems : sortedItems.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = Math.max(0, sortedItems.length - visibleItems.length);

  return (
    <div className="workspace-v2-signal-group">
      <span className="workspace-v2-signal-group__label">{label}</span>
      {visibleItems.length > 0 ? (
        <>
          <div className="workspace-v2-chip-set">
            {visibleItems.map((item) => (
              <span className={`workspace-v2-chip${soft ? " workspace-v2-chip--soft" : ""}`} key={item}>
                {item}
              </span>
            ))}
          </div>
          {sortedItems.length > MAX_VISIBLE_TAGS ? (
            <button className="workspace-v2-tag-toggle" onClick={onToggle} type="button">
              {expanded ? "Show less" : `+ ${hiddenCount} more`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="workspace-v2-muted">{emptyCopy}</p>
      )}
    </div>
  );
}

export function WorkspaceContent({
  initialCases,
  initialCredentials,
  initialIdentity,
}: WorkspaceContentProps) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [identity, setIdentity] = useState(initialIdentity);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUpdating, startTransition] = useTransition();
  const [credentials] = useState(initialCredentials);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

      const { error } = await supabase.from("freelancer_cases").delete().eq("freelancer_id", user.id);

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
  const safePositioning = refinePositioning(identity.positioning?.trim() || "");
  const safeCoreCapabilities = Array.from(new Set(identity.coreCapabilities ?? []));
  const safeFunctionalSkills = Array.from(new Set(identity.functionalSkills ?? []));
  const safeIndustries = Array.from(new Set(identity.industries ?? []));
  const profileStrength = getProfileStrength(safeCases.length, credentials);
  const helperCopy =
    safeCases.length === 1
      ? "This is your first signal. Add more examples to reveal your deeper pattern."
      : "Your identity is evolving as patterns emerge from your work.";
  const subtleSeniority =
    identity.seniority && identity.seniority !== "Unknown" ? identity.seniority : "";

  function toggleGroup(groupKey: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  if (safeCases.length === 0) {
    return (
      <div className="identity-workspace identity-workspace--v2">
        <section className="workspace-v2-empty">
          <div aria-hidden="true" className="workspace-v2-hero__halo" />
          <div className="workspace-v2-empty__panel">
            <span className="workspace-v2-hero__eyebrow">Welcome to NEXA</span>
            <h1 className="workspace-v2-empty__title">Start building your profile</h1>
            <p className="workspace-v2-empty__copy">
              Add your first real example to turn raw work into a clearer identity.
            </p>
            <div className="button-row">
              <Button href="/onboarding/case">+ Add your first case</Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="identity-workspace identity-workspace--v2">
        <div className="workspace-v2-toolbar">
          <button
            className="workspace-v2-toolbar__action"
            disabled={isUpdating}
            onClick={handleResetProfile}
            type="button"
          >
            {isUpdating ? "Resetting..." : "Reset profile"}
          </button>
        </div>

        <section className="workspace-v2-hero">
          <div aria-hidden="true" className="workspace-v2-hero__halo" />
          <div aria-hidden="true" className="workspace-v2-hero__halo workspace-v2-hero__halo--secondary" />

          <div className="workspace-v2-hero__panel">
            <div className="workspace-v2-hero__intro">
              <span className="workspace-v2-hero__eyebrow">NEXA understands you as</span>
              <h1 className="workspace-v2-hero__title">{safePositioning}</h1>
              <p className="workspace-v2-hero__support">{helperCopy}</p>
            </div>

            {subtleSeniority ? (
              <div className="workspace-v2-hero__meta">
                <span className="workspace-v2-seniority">{subtleSeniority}</span>
              </div>
            ) : null}

            <div className="workspace-v2-signal-grid">
              <TagGroup
                emptyCopy="Still taking shape."
                expanded={Boolean(expandedGroups.core)}
                items={safeCoreCapabilities}
                label="Core strengths"
                onToggle={() => toggleGroup("core")}
              />

              <TagGroup
                emptyCopy="No execution skills surfaced yet."
                expanded={Boolean(expandedGroups.execution)}
                items={safeFunctionalSkills}
                label="Execution skills"
                onToggle={() => toggleGroup("execution")}
                soft
              />

              <TagGroup
                emptyCopy="No industry pattern yet."
                expanded={Boolean(expandedGroups.industries)}
                items={safeIndustries}
                label="Industries"
                onToggle={() => toggleGroup("industries")}
                soft
              />
            </div>
          </div>
        </section>

        <div className="workspace-v2-grid">
          <div className="workspace-v2-column workspace-v2-column--main">
            <section className="workspace-v2-panel workspace-v2-panel--cases">
              <div className="workspace-v2-panel__header workspace-v2-panel__header--spread">
                <div className="workspace-v2-panel__intro">
                  <span className="workspace-v2-panel__eyebrow">Your work</span>
                  <h2 className="workspace-v2-panel__title">Cases that shape your signal</h2>
                  <p className="workspace-v2-panel__copy">
                    Each case strengthens and refines how NEXA understands you.
                  </p>
                </div>
                <Button className="workspace-v2-add-case" href="/onboarding/case" variant="secondary">
                  + Add another case
                </Button>
              </div>

              {notice ? <p className="workspace-v2-notice">{notice}</p> : null}

              <div className="workspace-v2-case-list">
                {safeCases.map((freelancerCase, index) => (
                  <article className="workspace-v2-case" key={freelancerCase.id}>
                    <div className="workspace-v2-case__meta">
                      <div className="workspace-v2-case__heading">
                        <span className="workspace-v2-case__label">Case {index + 1}</span>
                        <h3 className="workspace-v2-case__title">{getCaseTitle(freelancerCase.rawText)}</h3>
                      </div>
                      <span className="workspace-v2-case__date">
                        {new Date(freelancerCase.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="workspace-v2-case__copy">{getCasePreview(freelancerCase.rawText)}</p>

                    <CaseItemActions
                      caseId={freelancerCase.id}
                      disabled={isUpdating}
                      onCaseDeleted={handleCaseDeleted}
                    />
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="workspace-v2-column workspace-v2-column--side">
            <section className="workspace-v2-panel workspace-v2-panel--metric">
              <div className="workspace-v2-panel__intro">
                <span className="workspace-v2-panel__eyebrow">Profile strength</span>
                <h2 className="workspace-v2-panel__title">Signal strength: {profileStrength}%</h2>
              </div>

              <div className="workspace-v2-metric-list">
                <div className="workspace-v2-metric">
                  <span className="workspace-v2-metric__label">Cases added</span>
                  <strong className="workspace-v2-metric__value">{safeCases.length}</strong>
                </div>
                <div className="workspace-v2-metric">
                  <span className="workspace-v2-metric__label">Verified credentials</span>
                  <strong className="workspace-v2-metric__value">{credentials.length}</strong>
                </div>
                <div className="workspace-v2-metric">
                  <span className="workspace-v2-metric__label">External signals</span>
                  <strong className="workspace-v2-metric__value">0</strong>
                </div>
              </div>

              <p className="workspace-v2-panel__copy">
                Add proof and external signals to strengthen your profile.
              </p>
            </section>

            <section className="workspace-v2-panel workspace-v2-panel--credentials">
              <div className="workspace-v2-panel__header workspace-v2-panel__header--spread">
                <div className="workspace-v2-panel__intro">
                  <span className="workspace-v2-panel__eyebrow">Validated proof</span>
                  <h2 className="workspace-v2-panel__title">Credentials</h2>
                </div>
                <Button href="/freelancer/credentials" variant="secondary">
                  + Add validated proof
                </Button>
              </div>

              <p className="workspace-v2-panel__copy">
                Add AI-validated proof to strengthen your professional identity.
              </p>

              {credentials.length > 0 ? (
                <div className="workspace-v2-credential-list">
                  {credentials.map((credential) => {
                    const reasons = Array.isArray(credential.confidenceReason)
                      ? credential.confidenceReason
                      : [];

                    return (
                      <article className="workspace-v2-credential" key={credential.id}>
                        <div className="workspace-v2-credential__meta">
                          <strong className="workspace-v2-credential__title">{credential.title}</strong>
                          <span
                            className={`workspace-v2-credential__badge workspace-v2-credential__badge--${
                              credential.confidenceLevel ?? "low"
                            }`}
                          >
                            {credential.confidenceLevel
                              ? `${credential.confidenceLevel[0]?.toUpperCase() ?? ""}${credential.confidenceLevel.slice(1)} confidence`
                              : "Confidence pending"}
                          </span>
                        </div>
                        <p className="workspace-v2-credential__issuer">
                          {credential.issuer || "Issuer not provided"}
                        </p>
                        <p className="workspace-v2-credential__validation">AI-validated</p>
                        {reasons.length > 0 ? (
                          <ul className="workspace-v2-credential__reasons">
                            {reasons.slice(0, 2).map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="workspace-v2-empty-copy">No proof added yet — strengthen your credibility.</p>
              )}
            </section>

            <section className="workspace-v2-panel workspace-v2-panel--signals">
              <div className="workspace-v2-panel__intro">
                <span className="workspace-v2-panel__eyebrow">External signals</span>
                <h2 className="workspace-v2-panel__title">External validation</h2>
              </div>
              <ul className="workspace-v2-signal-list">
                {["LinkedIn", "Website", "YouTube", "Reviews", "Portfolio"].map((item) => (
                  <li className="workspace-v2-signal-list__item" key={item}>
                    <span>{item}</span>
                    <span className="workspace-v2-signal-list__status">Coming soon</span>
                  </li>
                ))}
              </ul>
              <p className="workspace-v2-panel__copy">
                Connect trusted public signals to strengthen your profile.
              </p>
            </section>
          </div>
        </div>
      </div>

    </>
  );
}
