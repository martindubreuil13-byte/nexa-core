"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { persistLatestCaseExtraction } from "../../../lib/extract/latest-case-storage";
import { Textarea } from "../../../components/ui/textarea";
import type { CaseExtractionResult } from "../../../lib/extract/schema";

type CaseExtractionResponse = CaseExtractionResult & {
  caseCount?: number;
  caseId?: string | null;
};

type CaseExtractionFlowProps = {
  initialCaseCount?: number;
  initialCaseId?: string | null;
  initialResult?: CaseExtractionResult | null;
  initialText?: string;
};

const fallbackResult: CaseExtractionResponse = {
  positioning: "",
  capabilities: [],
  industries: [],
  services: [],
  seniority: "Unknown",
  caseCount: 0,
  caseId: null,
};

function normalizeResult(value: Partial<CaseExtractionResponse> | null | undefined): CaseExtractionResponse {
  return {
    positioning: typeof value?.positioning === "string" ? value.positioning.trim() : fallbackResult.positioning,
    capabilities:
      Array.isArray(value?.capabilities)
        ? value.capabilities.filter(
            (item): item is string => typeof item === "string" && Boolean(item.trim()),
          )
        : fallbackResult.capabilities,
    industries:
      Array.isArray(value?.industries)
        ? value.industries.filter(
            (item): item is string => typeof item === "string" && Boolean(item.trim()),
          )
        : fallbackResult.industries,
    services:
      Array.isArray(value?.services)
        ? value.services.filter(
            (item): item is string => typeof item === "string" && Boolean(item.trim()),
          )
        : fallbackResult.services,
    seniority:
      value?.seniority && ["Junior", "Mid", "Senior", "Expert", "Unknown", "DEBUG"].includes(value.seniority)
        ? value.seniority
        : fallbackResult.seniority,
    caseCount: typeof value?.caseCount === "number" ? value.caseCount : fallbackResult.caseCount,
    caseId: typeof value?.caseId === "string" && value.caseId.trim() ? value.caseId : null,
  };
}

function getPositioningCopy(result: CaseExtractionResponse) {
  return result.positioning.trim();
}

export function CaseExtractionFlow({
  initialCaseCount = 0,
  initialCaseId = null,
  initialResult = null,
  initialText = "",
}: CaseExtractionFlowProps) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<CaseExtractionResponse | null>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [caseCount, setCaseCount] = useState(initialCaseCount);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(initialCaseId);
  const hasPositioning = Boolean(result?.positioning?.trim());
  const hasCapabilities = Boolean(result && result.capabilities.length > 0);
  const hasIndustries = Boolean(result && result.industries.length > 0);

  useEffect(() => {
    setText(initialText);
    setResult(initialResult);
    setCaseCount(initialCaseCount);
    setCurrentCaseId(initialCaseId);
  }, [initialCaseCount, initialCaseId, initialResult, initialText]);

  function goToWorkspace() {
    router.push("/freelancer?from=onboarding");
  }

  function focusComposer() {
    const composer = window.document.getElementById("case-input");
    composer?.scrollIntoView({ behavior: "smooth", block: "center" });
    composer?.focus();
  }

  async function runExtraction(caseText: string) {
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ caseId: currentCaseId, text: caseText }),
      });

      const payload = (await response.json().catch(() => null)) as Partial<CaseExtractionResponse> | null;

      if (!response.ok) {
        return normalizeResult(payload);
      }

      return normalizeResult(payload);
    } catch {
      return fallbackResult;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const extractionResult = await runExtraction(text);
      setResult(extractionResult);
      setCurrentCaseId(extractionResult.caseId ?? currentCaseId);
      setCaseCount(extractionResult.caseCount ?? caseCount);
      persistLatestCaseExtraction(extractionResult);
      setIsRefining(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  function handleRefineCase() {
    setIsRefining(true);
    focusComposer();
  }

  function handleAddAnotherExample() {
    setText("");
    setResult(null);
    setCurrentCaseId(null);
    setIsRefining(false);

    window.requestAnimationFrame(() => {
      const composer = window.document.getElementById("case-input") as HTMLTextAreaElement | null;
      composer?.focus();
      composer?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="case-flow">
      <Card
        className="case-flow__panel case-flow__panel--composer case-flow__panel--delayed"
        title={currentCaseId ? "Continue refining this case." : "Start with one thing you’ve done."}
      >
        <form className="stack" onSubmit={handleSubmit}>
          <span className="case-flow__label">{currentCaseId ? "Editing case" : "New example"}</span>
          <Textarea
            id="case-input"
            label="Tell me about something you worked on."
            name="case"
            placeholder="Describe the project, what you were solving, how you approached it, and what changed."
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <p className="case-flow__helper">
            What was going on?
            <br />
            What did you actually change?
            <br />
            What was the outcome?
          </p>

          {caseCount > 0 ? <p className="case-flow__helper">You&apos;ve added {caseCount} case{caseCount === 1 ? "" : "s"}.</p> : null}

          <div className="button-row">
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Reading your work..." : currentCaseId ? "Update this case" : "See the first pass"}
            </Button>
          </div>
        </form>
      </Card>

      {result ? (
        <>
          <Card className="case-flow__panel case-flow__result case-flow__panel--delayed" title="NEXA understands you as">
            <div className="case-flow__positioning">
              {hasPositioning ? (
                <p className="case-flow__positioning-copy">{getPositioningCopy(result)}</p>
              ) : (
                <p className="case-flow__empty-copy">No positioning returned yet.</p>
              )}
            </div>

            <div className="case-flow__section">
              <span className="case-flow__label">Capabilities</span>
              {hasCapabilities ? (
                <div className="case-flow__tags">
                  {result.capabilities.map((item) => (
                    <span className="badge" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="case-flow__empty-copy">Still taking shape from this first read.</p>
              )}
            </div>

            <div className="case-flow__section">
              <span className="case-flow__label">Industries</span>
              {hasIndustries ? (
                <div className="case-flow__tags">
                  {result.industries.map((item) => (
                    <span className="badge" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="case-flow__empty-copy">NEXA will pull more context as you add detail.</p>
              )}
            </div>

            <div className="case-flow__section">
              <span className="case-flow__label">Seniority</span>
              <span className="badge case-flow__badge">{result.seniority}</span>
            </div>

            <p className="case-flow__improve-copy">
              This is a first pass. The more you share, the sharper it becomes.
            </p>
          </Card>

          <div className="button-row case-flow__actions">
            <button className="button button--ghost" onClick={handleRefineCase} type="button">
              Refine this case
            </button>
            <button className="button button--ghost" onClick={handleAddAnotherExample} type="button">
              Add another example
            </button>
            <button className="button button--secondary" onClick={goToWorkspace} type="button">
              Continue to workspace
            </button>
          </div>

          {isRefining ? (
            <p className="case-flow__helper case-flow__helper--followup">
              Add a little more detail above, then run another pass whenever you&apos;re ready.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
