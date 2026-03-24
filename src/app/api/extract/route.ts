import { NextResponse } from "next/server";

import { caseExtractionSchema, type CaseExtractionResult } from "../../../lib/extract/schema";
import { getRequiredEnv } from "../../../lib/utils/env";

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
};

const fallbackResult: CaseExtractionResult = {
  capabilities: [],
  industries: [],
  positioning: "",
  services: [],
  seniority: "Mid",
};

function getOutputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text;
}

function hasStructuredData(result: Omit<CaseExtractionResult, "positioning">) {
  return (
    result.capabilities.length > 0 ||
    result.industries.length > 0 ||
    result.services.length > 0
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json(fallbackResult);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getRequiredEnv("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are an expert system that extracts REAL professional capabilities from a freelancer case description.\n\nYour job is to identify what the person ACTUALLY DID — not general domains.\n\nRULES:\n- Be specific and concrete\n- Avoid vague terms like: 'development', 'business', 'consulting'\n- Focus on actions, systems, and outcomes\n- Infer intelligently when needed, but stay grounded\n\nExtract ONLY:\n- capabilities (max 6) -> specific skills/actions (e.g. 'authentication systems', 'pricing strategy design', 'React frontend architecture')\n- industries (max 4) -> inferred if needed (e.g. SaaS, retail, healthcare)\n- services (max 5) -> what they would sell (e.g. 'platform backend development', 'market entry strategy')\n- seniority -> one of: Junior, Mid, Senior, Expert\n\nReturn ONLY valid JSON.\nNo explanation.\nNo extra text.",
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
        text: {
          format: {
            type: "json_schema",
            name: "case_extraction",
            strict: true,
            schema: caseExtractionSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(fallbackResult);
    }

    const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;
    const rawText = payload ? getOutputText(payload) : "";

    console.log("AI RAW RESPONSE:", rawText);

    if (!rawText) {
      return NextResponse.json(fallbackResult);
    }

    try {
      const extraction = JSON.parse(rawText) as Omit<CaseExtractionResult, "positioning">;

      if (!hasStructuredData(extraction)) {
        return NextResponse.json(fallbackResult);
      }

      const positioningResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getRequiredEnv("OPENAI_API_KEY")}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_POSITIONING_MODEL ?? process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini",
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: "Generate ONE positioning sentence from the provided data. Max 25 words. No buzzwords. Be specific. Sound human. Return ONLY valid JSON with {\"positioning\":\"...\"}. No extra text.",
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify(extraction),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "positioning_sentence",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  positioning: {
                    type: "string",
                  },
                },
                required: ["positioning"],
                additionalProperties: false,
              },
            },
          },
        }),
      });

      if (!positioningResponse.ok) {
        return NextResponse.json({
          ...extraction,
          positioning: "",
        } satisfies CaseExtractionResult);
      }

      const positioningPayload = (await positioningResponse.json().catch(() => null)) as OpenAIResponse | null;
      const rawPositioning = positioningPayload ? getOutputText(positioningPayload) : "";

      if (!rawPositioning) {
        return NextResponse.json({
          ...extraction,
          positioning: "",
        } satisfies CaseExtractionResult);
      }

      const positioning = JSON.parse(rawPositioning) as { positioning?: string };

      return NextResponse.json({
        ...extraction,
        positioning: typeof positioning.positioning === "string" ? positioning.positioning.trim() : "",
      } satisfies CaseExtractionResult);
    } catch {
      return NextResponse.json(fallbackResult);
    }
  } catch {
    return NextResponse.json(fallbackResult);
  }
}
