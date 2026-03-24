"use client";

import { useState } from "react";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { TextInput } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { CaseExtractionResult } from "../../../lib/extract/schema";

type RefineQuestionId = "tools" | "outcome" | "actions";

type RefineQuestion = {
  id: RefineQuestionId;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
};

const refineQuestionMap: Record<RefineQuestionId, RefineQuestion> = {
  tools: {
    id: "tools",
    label: "What tools or technologies did you use?",
    placeholder: "Examples: Figma, React, SQL, HubSpot, Excel",
    type: "input",
  },
  outcome: {
    id: "outcome",
    label: "What changed after your work?",
    placeholder: "Examples: conversion improved, delivery time dropped, team moved faster",
    type: "input",
  },
  actions: {
    id: "actions",
    label: "What did you personally do?",
    placeholder: "Describe the part you led, built, decided, or delivered.",
    type: "textarea",
  },
};

function hasStructuredData(result: CaseExtractionResult) {
  return (
    result.capabilities.length > 0 ||
    result.industries.length > 0 ||
    result.services.length > 0
  );
}

function getRefinementQuestions(text: string, result: CaseExtractionResult) {
  const normalizedText = text.toLowerCase();
  const questions: RefineQuestion[] = [];

  const hasToolSignals =
    /\b(figma|react|next\.?js|typescript|javascript|python|sql|postgres|supabase|openai|excel|notion|jira|aws|gcp|docker|tableau|hubspot|salesforce|slack)\b/.test(
      normalizedText,
    ) || result.capabilities.length >= 2;

  const hasOutcomeSignals =
    /\b(increased|reduced|improved|launched|saved|grew|cut|boosted|achieved|delivered|result|impact|outcome|revenue|users|conversion|efficiency|time|cost|retention|adoption)\b/.test(
      normalizedText,
    ) || /\d/.test(normalizedText) || normalizedText.includes("%");

  const hasActionSignals =
    /\b(i|my|personally|led|built|designed|implemented|created|managed|launched|optimized|developed|wrote|owned|advised|analyzed|researched|shipped)\b/.test(
      normalizedText,
    ) || result.services.length > 0;

  if (!hasToolSignals) {
    questions.push(refineQuestionMap.tools);
  }

  if (!hasOutcomeSignals) {
    questions.push(refineQuestionMap.outcome);
  }

  if (!hasActionSignals) {
    questions.push(refineQuestionMap.actions);
  }

  if (questions.length === 0) {
    questions.push(refineQuestionMap.actions);
  }

  return questions.slice(0, 3);
}

export function CaseExtractionFlow() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CaseExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRefinedResult, setIsRefinedResult] = useState(false);
  const [refineAnswers, setRefineAnswers] = useState<Record<string, string>>({});

  async function runExtraction(caseText: string) {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: caseText }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : "Extraction failed.");
    }

    setResult(payload as CaseExtractionResult);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      await runExtraction(text);
      setIsRefining(false);
      setIsRefinedResult(false);
      setRefineAnswers({});
    } catch (submissionError) {
      setResult(null);
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to extract structure.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefineSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const refinementText = Object.entries(refineAnswers)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value.trim()}`)
      .join("\n");

    if (!refinementText) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await runExtraction(`${text}\n\nAdditional clarity for NEXA:\n${refinementText}`);
      setIsRefining(false);
      setIsRefinedResult(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to refine extraction.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const refinementQuestions = result ? getRefinementQuestions(text, result) : [];

  return (
    <div className="case-flow">
      <Card
        className="case-flow__panel"
        title="Share a case"
        description="Tell us about something you’ve done."
      >
        <form className="stack" onSubmit={handleSubmit}>
          <div className="case-flow__toolbar">
            <button className="case-flow__voice-toggle" disabled type="button">
              🎤 Talk instead (coming soon)
            </button>
          </div>

          <Textarea
            id="case-input"
            label="Case"
            name="case"
            placeholder="Describe the project, what you were solving, how you approached it, and what changed."
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />

          {error ? <p className="auth-shell__message auth-shell__message--error">{error}</p> : null}

          <div className="button-row">
            <Button disabled={isLoading || !text.trim()} type="submit">
              {isLoading ? "Extracting..." : "Continue"}
            </Button>
          </div>
        </form>
      </Card>

      {result ? (
        hasStructuredData(result) ? (
          <Card className="case-flow__panel case-flow__result" title="Structured result">
            {result.positioning ? (
              <div className="case-flow__positioning">
                <span className="case-flow__label">
                  {isRefinedResult ? "NEXA refined your positioning" : "NEXA understands you as:"}
                </span>
                <p className="case-flow__positioning-copy">{result.positioning}</p>
              </div>
            ) : null}

            {result.capabilities.length > 0 ? (
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

            {result.industries.length > 0 ? (
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

            {result.services.length > 0 ? (
              <div className="case-flow__section">
                <span className="case-flow__label">Services</span>
                <ul className="case-flow__services">
                  {result.services.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="case-flow__section">
              <span className="case-flow__label">Seniority</span>
              <span className="badge case-flow__badge">{result.seniority}</span>
            </div>

            <div className="button-row case-flow__actions">
              <button
                className="button button--ghost"
                onClick={() => setIsRefining((value) => !value)}
                type="button"
              >
                Refine your case
              </button>
              <button
                className="button button--ghost"
                onClick={() => {
                  setText("");
                  setResult(null);
                  setIsRefining(false);
                  setIsRefinedResult(false);
                  setRefineAnswers({});
                }}
                type="button"
              >
                Add another example
              </button>
              <Button href="/onboarding/profile">Continue to profile</Button>
            </div>
          </Card>
        ) : (
          <Card className="case-flow__panel case-flow__result" title="NEXA needs a bit more detail">
            <p className="case-flow__empty-copy">
              NEXA needs a bit more detail to understand your expertise.
            </p>
            <div className="button-row case-flow__actions">
              <button
                className="button button--ghost"
                onClick={() => setIsRefining(true)}
                type="button"
              >
                Refine your case
              </button>
            </div>
          </Card>
        )
      ) : null}

      {isRefining && result ? (
        <Card
          className="case-flow__panel case-flow__result"
          title="NEXA needs a bit more clarity"
          description="Help us sharpen your profile"
        >
          <form className="stack" onSubmit={handleRefineSubmit}>
            {refinementQuestions.map((question) =>
              question.type === "textarea" ? (
                <Textarea
                  id={`refine-${question.id}`}
                  key={question.id}
                  label={question.label}
                  name={question.id}
                  placeholder={question.placeholder}
                  rows={5}
                  value={refineAnswers[question.id] ?? ""}
                  onChange={(event) =>
                    setRefineAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                />
              ) : (
                <TextInput
                  id={`refine-${question.id}`}
                  key={question.id}
                  label={question.label}
                  name={question.id}
                  placeholder={question.placeholder}
                  value={refineAnswers[question.id] ?? ""}
                  onChange={(event) =>
                    setRefineAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                />
              ),
            )}

            <div className="button-row case-flow__actions">
              <Button
                disabled={
                  isLoading || !refinementQuestions.some((question) => refineAnswers[question.id]?.trim())
                }
                type="submit"
              >
                {isLoading ? "Refining..." : "Refine your case"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
