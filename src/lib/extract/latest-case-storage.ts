import type { CaseExtractionResult } from "./schema";

const STORAGE_KEY = "nexa.latest-case-extraction";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSeniority(value: unknown): value is CaseExtractionResult["seniority"] {
  return (
    value === "Junior" ||
    value === "Mid" ||
    value === "Senior" ||
    value === "Expert" ||
    value === "Unknown"
  );
}

function isCaseExtractionResult(value: unknown): value is CaseExtractionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof CaseExtractionResult, unknown>>;

  return (
    isStringArray(candidate.capabilities) &&
    isStringArray(candidate.industries) &&
    isStringArray(candidate.services) &&
    typeof candidate.positioning === "string" &&
    isSeniority(candidate.seniority)
  );
}

export function persistLatestCaseExtraction(result: CaseExtractionResult) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function readLatestCaseExtraction() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    return isCaseExtractionResult(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}
