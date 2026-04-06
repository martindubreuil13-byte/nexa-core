import "server-only";

import { PDFParse } from "pdf-parse";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getOpenAIClient } from "../../lib/openai/server";
import type { Database, TableInsert, TableRow } from "../../types/database";
import { normalizeStringArray } from "./normalizeCredential";

const CREDENTIALS_BUCKET = "certifications";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_CREDENTIALS_MODEL ?? "gpt-4o-mini";
const MAX_TEXT_FOR_AI = 12_000;
const MAX_SUMMARY_LENGTH = 500;
const MIN_CONFIDENCE_SCORE = 0;
const MAX_CONFIDENCE_SCORE = 100;

type SaveCredentialParams = {
  draft?: Partial<CredentialAnalysisDraft>;
  file: File;
  supabase: SupabaseClient<Database>;
  userId: string;
};

type ParsedCredential = {
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string[];
  confidenceScore: number;
  flags: string[];
  issueDate: string | null;
  issuer: string | null;
  skills: string[];
  summary: string;
  title: string;
  type: string;
};

export type CredentialAnalysisDraft = {
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string[];
  confidenceScore: number;
  extractedText: string;
  flags: string[];
  issueDate: string | null;
  issuer: string | null;
  skills: string[];
  summary: string;
  title: string;
  type: string;
  userDecision: "approved" | "edited";
};

export class CredentialUploadError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CredentialUploadError";
    this.status = status;
  }
}

export async function analyzeCredentialFile(file: File): Promise<CredentialAnalysisDraft> {
  validateFile(file);

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  return buildCredentialDraft({
    file,
    fileBuffer,
  });
}

export async function saveCredential({
  draft,
  file,
  supabase,
  userId,
}: SaveCredentialParams): Promise<TableRow<"credentials">> {
  validateFile(file);

  const credentialId = crypto.randomUUID();
  const fileExtension = getFileExtension(file);
  const filePath = `${userId}/${credentialId}/original.${fileExtension}`;

  const uploadResult = await supabase.storage.from(CREDENTIALS_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadResult.error) {
    throw new CredentialUploadError(uploadResult.error.message, 502);
  }

  try {
    const analyzedDraft = await analyzeCredentialFile(file);
    const editableDraft = normalizeDraftInput(draft);
    const resolvedDraft: CredentialAnalysisDraft = {
      ...analyzedDraft,
      title: editableDraft.title || analyzedDraft.title,
      issuer: editableDraft.issuer ?? analyzedDraft.issuer,
      issueDate: editableDraft.issueDate ?? analyzedDraft.issueDate,
      summary: editableDraft.summary || analyzedDraft.summary,
      userDecision: (editableDraft.userDecision ?? "approved") as "approved" | "edited",
    };

    return await insertCredentialRecord({
      credentialId,
      filePath: uploadResult.data.path,
      draft: resolvedDraft,
      supabase,
      userId,
    });
  } catch (error) {
    await removeUploadedFile(supabase, uploadResult.data.path);
    throw error;
  }
}

function validateFile(file: File) {
  if (file.size === 0) {
    throw new CredentialUploadError("Please upload a file.", 400);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new CredentialUploadError("Please upload a file smaller than 10 MB.", 413);
  }

  if (!isPdfFile(file) && !isImageFile(file)) {
    throw new CredentialUploadError("Only PDF and image files are supported.", 415);
  }
}

async function buildCredentialDraft({
  draft,
  file,
  fileBuffer,
}: {
  draft?: Partial<CredentialAnalysisDraft>;
  file: File;
  fileBuffer: Buffer;
}): Promise<CredentialAnalysisDraft> {
  const normalizedDraft = normalizeDraftInput(draft);

  if (!normalizedDraft.extractedText) {
    const extractedText = await extractTextFromCredential(file, fileBuffer);

    if (!extractedText) {
      throw new CredentialUploadError(
        "We could not extract readable text from that credential. Please try a clearer file.",
        422,
      );
    }

    const parsedCredential = await parseCredentialDocument({
      extractedText,
      fileName: file.name,
    });

    return {
      extractedText,
      title: normalizedDraft.title || parsedCredential.title || getFallbackTitle(file.name),
      issuer: normalizedDraft.issuer ?? parsedCredential.issuer,
      issueDate: normalizedDraft.issueDate ?? parsedCredential.issueDate,
      summary: normalizedDraft.summary || parsedCredential.summary,
      confidenceScore: normalizedDraft.confidenceScore ?? parsedCredential.confidenceScore,
      confidenceLevel:
        normalizedDraft.confidenceLevel || parsedCredential.confidenceLevel,
      confidenceReason:
        normalizedDraft.confidenceReason.length > 0
          ? normalizedDraft.confidenceReason
          : parsedCredential.confidenceReason,
      skills: normalizedDraft.skills.length > 0 ? normalizedDraft.skills : parsedCredential.skills,
      flags: normalizedDraft.flags.length > 0 ? normalizedDraft.flags : parsedCredential.flags,
      type: normalizedDraft.type || parsedCredential.type,
      userDecision: (normalizedDraft.userDecision ?? "approved") as "approved" | "edited",
    };
  }

  if (hasCompleteDraft(normalizedDraft)) {
    return {
      extractedText: normalizedDraft.extractedText,
      title: normalizedDraft.title,
      issuer: normalizedDraft.issuer,
      issueDate: normalizedDraft.issueDate,
      summary: normalizedDraft.summary,
      confidenceScore: normalizedDraft.confidenceScore,
      confidenceLevel: normalizedDraft.confidenceLevel,
      confidenceReason: normalizedDraft.confidenceReason,
      skills: normalizedDraft.skills,
      flags: normalizedDraft.flags,
      type: normalizedDraft.type,
      userDecision: normalizedDraft.userDecision,
    };
  }

  const parsedCredential = await parseCredentialDocument({
    extractedText: normalizedDraft.extractedText,
    fileName: file.name,
  });

  return {
    extractedText: normalizedDraft.extractedText,
    title: normalizedDraft.title || parsedCredential.title || getFallbackTitle(file.name),
    issuer: normalizedDraft.issuer ?? parsedCredential.issuer,
    issueDate: normalizedDraft.issueDate ?? parsedCredential.issueDate,
    summary: normalizedDraft.summary || parsedCredential.summary,
    confidenceScore: normalizedDraft.confidenceScore ?? parsedCredential.confidenceScore,
    confidenceLevel:
      normalizedDraft.confidenceLevel || parsedCredential.confidenceLevel,
    confidenceReason:
      normalizedDraft.confidenceReason.length > 0
        ? normalizedDraft.confidenceReason
        : parsedCredential.confidenceReason,
    skills: normalizedDraft.skills.length > 0 ? normalizedDraft.skills : parsedCredential.skills,
    flags: normalizedDraft.flags.length > 0 ? normalizedDraft.flags : parsedCredential.flags,
    type: normalizedDraft.type || parsedCredential.type,
    userDecision: (normalizedDraft.userDecision ?? "approved") as "approved" | "edited",
  };
}

async function extractTextFromCredential(file: File, fileBuffer: Buffer) {
  if (isPdfFile(file)) {
    return extractTextFromPdf(fileBuffer);
  }

  return extractTextFromImage(file, fileBuffer);
}

async function extractTextFromPdf(fileBuffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });

  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  } catch (error) {
    throw new CredentialUploadError(
      error instanceof Error ? `Unable to read PDF text: ${error.message}` : "Unable to read PDF text.",
      422,
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractTextFromImage(file: File, fileBuffer: Buffer) {
  const client = getOpenAIClient();
  const dataUrl = buildDataUrl(file.type, fileBuffer);

  const response = await client.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    instructions:
      "You are an OCR assistant for credential documents. Extract all readable text and return plain text only. Do not summarize. Preserve line breaks when useful.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extract the text from this credential image named "${file.name || "credential"}".`,
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "high",
          },
        ],
      },
    ],
    max_output_tokens: 2_000,
    temperature: 0,
  });

  return normalizeExtractedText(response.output_text);
}

async function parseCredentialDocument({
  extractedText,
  fileName,
}: {
  extractedText: string;
  fileName: string;
}): Promise<ParsedCredential> {
  const client = getOpenAIClient();
  const trimmedText =
    extractedText.length > MAX_TEXT_FOR_AI
      ? extractedText.slice(0, MAX_TEXT_FOR_AI)
      : extractedText;

  const response = await client.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    instructions: [
      "You parse credential documents into structured JSON for a product database.",
      "Use only the provided extracted text.",
      "If a value is not explicitly supported by the text, return an empty string for it.",
      "Return issue_date only as YYYY-MM-DD when the full date is clearly present. Otherwise return an empty string.",
      "Return summary as a concise 1-2 sentence summary of the credential.",
      "Return type as the best credential category such as certification, degree, license, award, or training.",
      "Return skills as short skill tags grounded in the text.",
      "Return confidence_score as a number from 0 to 100.",
      'Return confidence_level as "high", "medium", or "low".',
      "Return confidence_reason as three short human-readable bullet-point reasons explaining why the score was given.",
      "Return flags as notable concerns, ambiguities, or missing details. Return an empty array if none.",
      "Output strict JSON only.",
    ].join(" "),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [`File name: ${fileName || "credential"}`, "Extracted text:", trimmedText].join(
              "\n\n",
            ),
          },
        ],
      },
    ],
    max_output_tokens: 700,
    temperature: 0,
    text: {
      format: {
        type: "json_schema",
        name: "credential_parser",
        description: "Structured credential metadata parsed from extracted text.",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "issuer",
            "issue_date",
            "type",
            "skills",
            "summary",
            "confidence_score",
            "confidence_level",
            "confidence_reason",
            "flags",
          ],
          properties: {
            title: {
              type: "string",
              description: "Credential title exactly as it appears, or an empty string if unknown.",
            },
            issuer: {
              type: "string",
              description: "Issuing organization, or an empty string if unknown.",
            },
            issue_date: {
              type: "string",
              description: "Issue date as YYYY-MM-DD, or an empty string if unavailable.",
            },
            type: {
              type: "string",
              description: "Best-fit credential category, or an empty string if unclear.",
            },
            skills: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Short skills or competencies evidenced by the credential.",
            },
            summary: {
              type: "string",
              description: "A concise summary of what the credential represents.",
            },
            confidence_score: {
              type: "number",
              minimum: MIN_CONFIDENCE_SCORE,
              maximum: MAX_CONFIDENCE_SCORE,
              description: "Confidence in the parsed result from 0 to 100.",
            },
            confidence_level: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence band derived from the confidence score.",
            },
            confidence_reason: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Human-readable reasons explaining why the confidence score was given.",
            },
            flags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Potential issues, ambiguities, or missing details found in the document.",
            },
          },
        },
      },
    },
  });

  const parsed = parseStructuredCredential(response.output_text);

  return {
    title: parsed.title || getFallbackTitle(fileName),
    issuer: parsed.issuer || null,
    issueDate: normalizeIssueDate(parsed.issue_date),
    type: normalizeSingleLine(parsed.type),
    skills: normalizeStringList(parsed.skills, 8),
    summary: truncateSummary(parsed.summary),
    confidenceScore: clampConfidenceScore(parsed.confidence_score),
    confidenceLevel: deriveConfidenceLevel(parsed.confidence_score),
    confidenceReason: normalizeReasons(parsed.confidence_reason),
    flags: normalizeStringList(parsed.flags, 6),
  };
}

function parseStructuredCredential(rawText: string) {
  if (!rawText) {
    throw new CredentialUploadError("OpenAI did not return credential metadata.", 502);
  }

  try {
    const result = JSON.parse(rawText) as {
      confidence_level?: string;
      confidence_reason?: unknown;
      confidence_score?: number;
      flags?: unknown;
      issue_date?: string;
      issuer?: string;
      skills?: unknown;
      summary?: string;
      title?: string;
      type?: string;
    };

    const confidenceReason = normalizeStringArray(result.confidence_reason);
    const flags = normalizeStringArray(result.flags);
    const skills = normalizeStringArray(result.skills);
    const summary = typeof result.summary === "string" ? result.summary : "";

    return {
      title: normalizeSingleLine(result.title),
      issuer: normalizeSingleLine(result.issuer),
      issue_date: normalizeSingleLine(result.issue_date),
      type: normalizeSingleLine(result.type),
      skills: normalizeStringList(skills, 8),
      summary: normalizeWhitespace(summary),
      confidence_score:
        typeof result.confidence_score === "number" ? result.confidence_score : 0,
      confidence_level: normalizeConfidenceLevel(result.confidence_level),
      confidence_reason: normalizeReasons(
        confidenceReason.length > 0
          ? confidenceReason
          : ["Document structure partially recognized"],
      ),
      flags: normalizeStringList(flags, 6),
    };
  } catch {
    throw new CredentialUploadError("OpenAI returned invalid credential metadata.", 502);
  }
}

async function insertCredentialRecord({
  credentialId,
  draft,
  filePath,
  supabase,
  userId,
}: {
  credentialId: string;
  draft: CredentialAnalysisDraft;
  filePath: string;
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const confidenceReason = normalizeStringArray(draft.confidenceReason);
  const flags = normalizeStringArray(draft.flags);
  const skills = normalizeStringArray(draft.skills);
  const summary = typeof draft.summary === "string" ? draft.summary : "";

  const payload: TableInsert<"credentials"> = {
    id: credentialId,
    user_id: userId,
    file_path: filePath,
    extracted_text: draft.extractedText,
    ai_summary: summary,
    ai_confidence_score: draft.confidenceScore,
    confidence_level: draft.confidenceLevel,
    confidence_reason:
      confidenceReason.length > 0
        ? confidenceReason
        : ["Document structure partially recognized"],
    type: draft.type || null,
    skills,
    flags,
    user_decision: draft.userDecision,
    title: draft.title,
    issuer: draft.issuer,
    issue_date: draft.issueDate,
  };

  const { data, error } = await supabase
    .from("credentials")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    throw new CredentialUploadError(error.message, 502);
  }

  const credential = data as TableRow<"credentials"> | null;

  if (!credential) {
    throw new CredentialUploadError("Credential record was created without a response payload.", 502);
  }

  return credential;
}

async function removeUploadedFile(supabase: SupabaseClient<Database>, filePath: string) {
  const { error } = await supabase.storage.from(CREDENTIALS_BUCKET).remove([filePath]);

  if (error) {
    console.error("Failed to remove uploaded credential after an error.", {
      error: error.message,
      filePath,
    });
  }
}

function normalizeDraftInput(draft: Partial<CredentialAnalysisDraft> | undefined) {
  const confidenceScore =
    typeof draft?.confidenceScore === "number"
      ? clampConfidenceScore(draft.confidenceScore)
      : null;

  return {
    extractedText: normalizeExtractedText(draft?.extractedText ?? ""),
    title: normalizeSingleLine(draft?.title),
    issuer: normalizeNullableString(draft?.issuer),
    issueDate: normalizeIssueDateValue(draft?.issueDate),
    type: normalizeSingleLine(draft?.type),
    skills: normalizeStringList(draft?.skills, 8),
    summary: truncateSummary(draft?.summary ?? ""),
    confidenceScore,
    confidenceLevel:
      typeof draft?.confidenceLevel === "string"
        ? normalizeConfidenceLevel(draft.confidenceLevel) || deriveConfidenceLevel(confidenceScore ?? 0)
        : confidenceScore === null
          ? null
          : deriveConfidenceLevel(confidenceScore),
    confidenceReason: normalizeReasons(draft?.confidenceReason),
    flags: normalizeStringList(draft?.flags, 6),
    userDecision: normalizeUserDecision(draft?.userDecision) ?? "approved",
  };
}

function hasCompleteDraft(
  draft: ReturnType<typeof normalizeDraftInput>,
): draft is {
  extractedText: string;
  title: string;
  issuer: string | null;
  issueDate: string | null;
  type: string;
  skills: string[];
  summary: string;
  confidenceScore: number;
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string[];
  flags: string[];
  userDecision: "approved" | "edited";
} {
  return Boolean(
    draft.extractedText &&
      draft.title &&
      draft.summary &&
      typeof draft.confidenceScore === "number" &&
      draft.confidenceLevel &&
      draft.userDecision,
  );
}

function isPdfFile(file: File) {
  return file.type === "application/pdf";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function getFileExtension(file: File) {
  if (isPdfFile(file)) {
    return "pdf";
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();

  if (mimeExtension) {
    if (mimeExtension === "jpeg") {
      return "jpg";
    }

    if (mimeExtension === "svg+xml") {
      return "svg";
    }

    return mimeExtension.replace(/[^a-z0-9]+/g, "") || "bin";
  }

  const fileNameExtension = file.name.split(".").pop()?.toLowerCase();
  return fileNameExtension?.replace(/[^a-z0-9]+/g, "") || "bin";
}

function buildDataUrl(contentType: string, fileBuffer: Buffer) {
  const mimeType = contentType || "application/octet-stream";
  return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeWhitespace(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeSingleLine(value: string | undefined) {
  return normalizeWhitespace(value).replace(/\s*[\n\r]+\s*/g, " ");
}

function normalizeNullableString(value: string | null | undefined) {
  const normalizedValue = normalizeSingleLine(value ?? undefined);
  return normalizedValue || null;
}

function normalizeStringList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedValues: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalizedItem = normalizeSingleLine(item);

    if (!normalizedItem) {
      continue;
    }

    const normalizedKey = normalizedItem.toLowerCase();

    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(normalizedItem);

    if (normalizedValues.length >= maxItems) {
      break;
    }
  }

  return normalizedValues;
}

function normalizeIssueDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeIssueDateValue(value: string | null | undefined) {
  return normalizeIssueDate(normalizeSingleLine(value ?? undefined));
}

function truncateSummary(value: string) {
  const summary = normalizeWhitespace(value);

  if (!summary) {
    return "";
  }

  return summary.slice(0, MAX_SUMMARY_LENGTH);
}

function clampConfidenceScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_CONFIDENCE_SCORE, Math.max(MIN_CONFIDENCE_SCORE, value));
}

function normalizeConfidenceLevel(value: unknown) {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return null;
}

function normalizeUserDecision(value: unknown) {
  if (value === "approved" || value === "edited") {
    return value;
  }

  return null;
}

function deriveConfidenceLevel(score: number) {
  if (score > 75) {
    return "high" as const;
  }

  if (score >= 50) {
    return "medium" as const;
  }

  return "low" as const;
}

function normalizeReasons(value: unknown) {
  const reasons = normalizeStringList(value, 3);

  if (reasons.length > 0) {
    return reasons;
  }

  return [
    "The document text could only be parsed partially.",
    "Some credential fields were inferred from limited context.",
    "A manual review is recommended before relying on this result.",
  ];
}

function getFallbackTitle(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return normalizeSingleLine(baseName) || "Credential";
}
