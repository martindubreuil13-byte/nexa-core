"use client";

import { useSyncExternalStore } from "react";

import { Button } from "../../../components/ui/button";
import { readLatestCaseExtraction } from "../../../lib/extract/latest-case-storage";
import type { CaseExtractionResult } from "../../../lib/extract/schema";

type RevealPanelProps = {
  initialResult: CaseExtractionResult | null;
};

export function RevealPanel({ initialResult }: RevealPanelProps) {
  const latestResult = useSyncExternalStore(
    () => () => undefined,
    () => readLatestCaseExtraction(),
    () => null,
  );
  const result = latestResult ?? initialResult;

  return (
    <div className="case-flow">
      <section className="page-hero">
        <span className="eyebrow">Identity Reveal</span>
        <h1 className="page-title">This is how NEXA understands you</h1>
        <p className="page-copy">
          This is your starting profile. It evolves as you add more real work.
        </p>
      </section>

      <section className="grid">
        <div className="surface card case-flow__panel case-flow__result">
          {result?.positioning ? (
            <div className="case-flow__positioning">
              <span className="case-flow__label">Your current identity</span>
              <p className="case-flow__positioning-copy">{result.positioning}</p>
            </div>
          ) : (
            <div className="empty-state">
              Your first identity snapshot will appear here as soon as NEXA can structure your
              case clearly.
            </div>
          )}

          {result?.capabilities.length ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Capabilities</span>
              <div className="case-flow__tags">
                {result.capabilities.map((item) => (
                  <span className="badge" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {result?.industries.length ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Industries</span>
              <div className="case-flow__tags">
                {result.industries.map((item) => (
                  <span className="badge" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="case-flow__section">
              <span className="case-flow__label">Seniority</span>
              <span className="badge case-flow__badge">{result.seniority}</span>
            </div>
          ) : null}

          <div className="button-row">
            <Button href="/freelancer">Continue to your workspace</Button>
            <Button href="/onboarding/case" variant="secondary">
              Add another case
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
