import { NextResponse } from "next/server";

import type { CaseExtractionResult } from "../../../lib/extract/schema";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type OpenAIContentBlock = {
  text?: string;
  type?: string;
};

type OpenAIResponse = {
  output?: Array<{
    content?: OpenAIContentBlock[];
  }>;
  output_text?: string;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_INPUT_CHARS = 1500;
const OPENAI_TIMEOUT_MS = 15_000;
const EXTRACTION_MAX_OUTPUT_TOKENS = 320;
const MODEL_TEMPERATURE = 0.2;

const emptyResult: CaseExtractionResult = {
  capabilities: [],
  industries: [],
  positioning: "",
  services: [],
  seniority: "Unknown",
};

function sanitizeCaseText(value: string) {
  return value.trim().slice(0, MAX_INPUT_CHARS);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanListItem(value: string) {
  return normalizeWhitespace(value).replace(/^[`"'([{]+|[`"')\]}:;,.!?-]+$/g, "");
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

function normalizeList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const cleaned = cleanListItem(item);

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLocaleLowerCase("en-US");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleaned);

    if (normalized.length >= maxItems) {
      break;
    }
  }

  return normalized;
}

function extractRawText(response: OpenAIResponse | null) {
  console.log("=== FULL OPENAI RESPONSE ===");
  console.dir(response, { depth: null });
  console.log("RESPONSE output_text:", response?.output_text ?? null);
  console.log("RESPONSE output:", response?.output ?? null);

  let rawText = "";

  try {
    if (response?.output && Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const block of item.content) {
            console.log("RESPONSE content block:", block);

            if (block.type === "output_text" || block.text) {
              rawText += block.text || "";
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("TEXT EXTRACTION ERROR:", error);
  }

  if (!rawText && typeof response?.output_text === "string") {
    rawText = response.output_text;
  }

  console.log("RAW TEXT:", rawText);

  if (!rawText) {
    console.error("NO TEXT EXTRACTED — CHECK RESPONSE STRUCTURE");
  }

  return rawText;
}

function tryParseJson(rawText: string) {
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return null;
  }

  try {
    return JSON.parse(trimmedText) as unknown;
  } catch {
    const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/iu);

    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1]) as unknown;
      } catch {
        return null;
      }
    }

    const firstBrace = trimmedText.indexOf("{");
    const lastBrace = trimmedText.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmedText.slice(firstBrace, lastBrace + 1)) as unknown;
      } catch {
        return null;
      }
    }

    return null;
  }
}

function validateExtractionShape(value: unknown) {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof CaseExtractionResult, unknown>>)
      : null;

  const validation = {
    hasCapabilities: Array.isArray(candidate?.capabilities),
    hasIndustries: Array.isArray(candidate?.industries),
    hasPositioning: typeof candidate?.positioning === "string",
    hasServices: Array.isArray(candidate?.services),
    hasSeniority: isSeniority(candidate?.seniority),
    isObject: Boolean(candidate),
  };

  return {
    isValid:
      validation.isObject &&
      validation.hasPositioning &&
      validation.hasCapabilities &&
      validation.hasIndustries &&
      validation.hasServices &&
      validation.hasSeniority,
    validation,
  };
}

function normalizeExtraction(parsed: unknown, rawText: string): CaseExtractionResult {
  const candidate =
    parsed && typeof parsed === "object"
      ? (parsed as Partial<Record<keyof CaseExtractionResult | "skills", unknown>>)
      : {};

  return {
    positioning:
      typeof candidate.positioning === "string"
        ? normalizeWhitespace(candidate.positioning)
        : normalizeWhitespace(rawText),
    capabilities: normalizeList(candidate.capabilities ?? candidate.skills, 5),
    industries: normalizeList(candidate.industries, 3),
    services: normalizeList(candidate.services, 4),
    seniority: isSeniority(candidate.seniority) ? candidate.seniority : "Unknown",
  };
}

async function fetchOpenAI(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    return await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAIText({
  input,
  maxOutputTokens,
  model,
}: {
  input: Array<{
    content: Array<{
      text: string;
      type: "input_text";
    }>;
    role: "system" | "user";
  }>;
  maxOutputTokens: number;
  model: string;
}) {
  const response = await fetchOpenAI({
    model,
    input,
    max_output_tokens: maxOutputTokens,
    temperature: MODEL_TEMPERATURE,
  });
  const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;
  const rawText = extractRawText(payload);

  return {
    ok: response.ok,
    payload,
    rawText,
    status: response.status,
    statusText: response.statusText,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? sanitizeCaseText(body.text) : "";
  const caseId = typeof body?.caseId === "string" && body.caseId.trim() ? body.caseId.trim() : null;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("SUPABASE ERROR:", userError);
  }

  console.log("INPUT TEXT:", text);
  console.log("AUTH USER:", user?.id ?? null);

  if (!text) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  if (!user) {
    console.error("AUTH ERROR: No user found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUserId = user.id;

  if (!process.env.OPENAI_API_KEY) {
    const missingKeyError = new Error("Missing OPENAI_API_KEY");
    console.error("AI ERROR:", missingKeyError);

    return NextResponse.json(
      {
        ...emptyResult,
        error: missingKeyError.message,
      },
      { status: 500 },
    );
  }

  let extractionResponse;

  try {
    extractionResponse = await callOpenAIText({
      model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini",
      maxOutputTokens: EXTRACTION_MAX_OUTPUT_TOKENS,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                'Extract structured professional signals from the case description. Return only JSON with keys: positioning, capabilities, industries, services, seniority. Keep capabilities specific. Use seniority only from: Junior, Mid, Senior, Expert, Unknown.',
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    return NextResponse.json(
      {
        ...emptyResult,
        error: error instanceof Error ? error.message : "OpenAI call failed.",
      },
      { status: 500 },
    );
  }

  console.log("AI RAW RESPONSE:", extractionResponse.rawText);

  if (!extractionResponse.ok) {
    console.error("AI ERROR:", {
      status: extractionResponse.status,
      statusText: extractionResponse.statusText,
      rawText: extractionResponse.rawText,
    });
  }

  console.log("RAW TEXT BEFORE PARSING:", extractionResponse.rawText);

  const parsedOutput = tryParseJson(extractionResponse.rawText);
  console.log("PARSED OUTPUT:", parsedOutput);

  const validationResult = validateExtractionShape(parsedOutput);
  console.log("SCHEMA VALIDATION RESULT:", validationResult);

  const normalizedOutput = normalizeExtraction(parsedOutput, extractionResponse.rawText);
  console.log("NORMALIZED OUTPUT:", normalizedOutput);

  const aiResult = normalizedOutput;
  let savedCaseId: string | null = null;
  let caseCount = 0;
  const rawText = text;
  const safeTitle = rawText?.split("\n")[0]?.slice(0, 80).trim() || "Untitled case";
  const positioning = aiResult.positioning;
  const capabilities = aiResult.capabilities;
  const industries = aiResult.industries;
  const services = aiResult.services;
  const seniority = aiResult.seniority;

  try {
    console.log("INSERT USER:", authUserId);
    console.log("RAW TEXT:", rawText);
    console.log("INSERT USER ID:", authUserId);
    console.log("AI RESULT:", aiResult);
    console.log("INSERT DATA:", {
      positioning,
      capabilities,
      industries,
    });

    if (caseId) {
      const { data: updatedCaseData, error: updateCaseError } = await supabase
        .from("freelancer_cases")
        .update({
          capabilities: capabilities || [],
          industries: industries || [],
          positioning: positioning || null,
          raw_text: rawText,
          seniority: seniority || null,
          services: services || [],
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", caseId)
        .eq("freelancer_id", authUserId)
        .select("id")
        .maybeSingle();

      if (updateCaseError) {
        console.error("CASE UPDATE ERROR:", updateCaseError);
      } else {
        savedCaseId = updatedCaseData ? ((updatedCaseData as { id: string }).id ?? null) : null;
      }
    }

    if (!savedCaseId) {
      const { data: insertedCaseData, error: insertCaseError } = await supabase
        .from("freelancer_cases")
        .insert([
          {
            freelancer_id: authUserId,
            title: safeTitle,
            case_type: "general",
            raw_text: rawText,
            positioning: positioning || null,
            capabilities: capabilities || [],
            industries: industries || [],
            services: services || [],
            seniority: seniority || null,
            created_at: new Date().toISOString(),
          },
        ] as never)
        .select()
        .single();

      if (insertCaseError) {
        console.error("CASE INSERT ERROR:", insertCaseError);
      } else {
        console.log("INSERT PAYLOAD:", {
          freelancer_id: authUserId,
          title: safeTitle,
          case_type: "general",
        });
        console.log("CASE INSERTED:", insertedCaseData);
        savedCaseId = (insertedCaseData as { id: string }).id ?? null;

        const { data: verify } = await supabase
          .from("freelancer_cases")
          .select("positioning, capabilities, industries")
          .eq("id", savedCaseId)
          .single();

        console.log("VERIFY SAVED:", verify);
      }
    }

    console.log("CASE SAVED:", {
      freelancerId: authUserId,
      caseId: savedCaseId,
    });

    const { data: verify, error: verifyError } = await supabase
      .from("freelancer_cases")
      .select("*")
      .eq("freelancer_id", authUserId);

    if (verifyError) {
      console.error("VERIFY CASE ERROR:", verifyError);
    } else {
      console.log("VERIFY CASES:", verify);
      caseCount = verify?.length ?? 0;
    }
  } catch (persistenceError) {
    console.error("PERSISTENCE ERROR:", persistenceError);
  }

  const responsePayload = {
    ...aiResult,
    caseCount,
    caseId: savedCaseId,
  };

  console.log("FINAL OUTPUT SENT:", JSON.stringify(responsePayload, null, 2));

  return NextResponse.json(responsePayload);
}
