import type { FreelancerCase } from "./getFreelancerCases";

type Seniority = "Junior" | "Mid" | "Senior" | "Expert" | "Unknown";

type SynthesizedIdentity = {
  coreCapabilities: string[];
  functionalSkills: string[];
  industries: string[];
  positioning: string;
  seniority: Seniority;
};

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
const OPENAI_TIMEOUT_MS = 15_000;
const SYNTHESIS_MAX_OUTPUT_TOKENS = 260;
const MAX_POSITIONING_WORDS = 12;
const BANNED_POSITIONING_PHRASES = [
  "consultant",
  "specializing in",
  "leveraging",
  "solutions",
  "dynamic professional",
];

const strategicKeywords = [
  "analysis",
  "architecture",
  "design",
  "framework",
  "market",
  "model",
  "planning",
  "positioning",
  "research",
  "strategy",
  "structure",
  "structuring",
  "system",
];

const executionKeywords = [
  "automation",
  "build",
  "delivery",
  "development",
  "execution",
  "implementation",
  "integration",
  "launch",
  "operations",
  "optimization",
  "prototype",
  "shipping",
  "workflow",
];

function normalizeSignal(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clean(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => typeof value === "string" && Boolean(normalizeSignal(value)));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function countOccurrences(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const normalizedValue = normalizeSignal(value);

    if (!normalizedValue) {
      return counts;
    }

    counts[normalizedValue] = (counts[normalizedValue] || 0) + 1;
    return counts;
  }, {});
}

function sortByFrequency(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "en-US", { sensitivity: "base" });
    })
    .map(([name]) => name);
}

function extractRawText(response: OpenAIResponse | null) {
  let rawText = "";

  if (response?.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item.content || !Array.isArray(item.content)) {
        continue;
      }

      for (const block of item.content) {
        if (block.type === "output_text" || block.text) {
          rawText += block.text || "";
        }
      }
    }
  }

  if (!rawText && typeof response?.output_text === "string") {
    rawText = response.output_text;
  }

  return normalizeSignal(rawText);
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

function normalizeList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalizedValue = normalizeSignal(item);

    if (!normalizedValue) {
      continue;
    }

    const normalizedKey = normalizedValue.toLocaleLowerCase("en-US");

    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(normalizedValue);

    if (normalizedValues.length >= maxItems) {
      break;
    }
  }

  return normalizedValues;
}

function normalizePositioning(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = normalizeSignal(value).replace(/\s+([,.!?])/g, "$1");

  if (!normalizedValue) {
    return "";
  }

  const normalizedLowercase = normalizedValue.toLocaleLowerCase("en-US");

  if (BANNED_POSITIONING_PHRASES.some((phrase) => normalizedLowercase.includes(phrase))) {
    return "";
  }

  return normalizedValue.split(" ").slice(0, MAX_POSITIONING_WORDS).join(" ").trim();
}

function isSeniority(value: unknown): value is Seniority {
  return value === "Junior" || value === "Mid" || value === "Senior" || value === "Expert" || value === "Unknown";
}

function matchesKeyword(value: string, keywords: string[]) {
  const normalizedValue = value.toLocaleLowerCase("en-US");
  return keywords.some((keyword) => normalizedValue.includes(keyword));
}

function splitSignals(capabilities: string[], services: string[]) {
  const normalizedCapabilities = normalizeList(capabilities, 10);
  const normalizedServices = normalizeList(services, 10);

  const coreCapabilities = normalizedCapabilities.filter((item) => matchesKeyword(item, strategicKeywords));
  const remainingCapabilities = normalizedCapabilities.filter((item) => !coreCapabilities.includes(item));
  const functionalSkills = [
    ...normalizedServices,
    ...remainingCapabilities.filter((item) => matchesKeyword(item, executionKeywords)),
    ...remainingCapabilities.filter((item) => !matchesKeyword(item, executionKeywords)),
  ];

  return {
    coreCapabilities: normalizeList(
      coreCapabilities.length > 0 ? coreCapabilities : normalizedCapabilities.slice(0, 5),
      5,
    ),
    functionalSkills: normalizeList(functionalSkills, 5),
  };
}

function pickHighestSeniority(cases: FreelancerCase[]): Seniority {
  const scores: Record<Seniority, number> = {
    Unknown: 0,
    Junior: 1,
    Mid: 2,
    Senior: 3,
    Expert: 4,
  };

  return cases.reduce<Seniority>((highest, freelancerCase) => {
    return scores[freelancerCase.seniority] > scores[highest] ? freelancerCase.seniority : highest;
  }, "Unknown");
}

function buildDeterministicPositioning(coreCapabilities: string[], industries: string[]) {
  const primaryCapability = coreCapabilities[0];
  const secondaryCapability = coreCapabilities[1];

  if (!primaryCapability && !secondaryCapability) {
    return "Still defining your pattern. Add more cases.";
  }

  if (primaryCapability && secondaryCapability) {
    return `Turns complexity into action through ${primaryCapability} and ${secondaryCapability}.`;
  }

  if (primaryCapability) {
    return `Turns ambiguity into execution through ${primaryCapability}.`;
  }

  return "Still defining your pattern. Add more cases.";
}

function normalizeSynthesizedIdentity(value: unknown, fallback: SynthesizedIdentity) {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof SynthesizedIdentity, unknown>>)
      : null;

  return {
    positioning: normalizePositioning(candidate?.positioning) || fallback.positioning,
    coreCapabilities: normalizeList(candidate?.coreCapabilities, 5).length
      ? normalizeList(candidate?.coreCapabilities, 5)
      : fallback.coreCapabilities,
    functionalSkills: normalizeList(candidate?.functionalSkills, 5).length
      ? normalizeList(candidate?.functionalSkills, 5)
      : fallback.functionalSkills,
    industries: normalizeList(candidate?.industries, 3).length
      ? normalizeList(candidate?.industries, 3)
      : fallback.industries,
    seniority: isSeniority(candidate?.seniority) ? candidate.seniority : fallback.seniority,
  };
}

async function fetchSynthesizedIdentity({
  combinedContext,
  coreCapabilities,
  functionalSkills,
  industries,
  seniority,
}: {
  combinedContext: string;
  coreCapabilities: string[];
  functionalSkills: string[];
  industries: string[];
  seniority: Seniority;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini",
        max_output_tokens: SYNTHESIS_MAX_OUTPUT_TOKENS,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You are defining a high-level professional identity.",
                  "",
                  "Return JSON only in this exact shape:",
                  '{ "positioning": string, "coreCapabilities": string[], "functionalSkills": string[], "industries": string[], "seniority": string }',
                  "",
                  "RULES",
                  "- positioning must be sharp, direct, credible, and max 12 words",
                  '- positioning must use a transformation format like "Turns X into Y" or "Builds X by doing Y"',
                  "- coreCapabilities are strategic, reusable across industries, and max 5",
                  "- functionalSkills are technical or execution oriented and max 5",
                  "- industries max 3",
                  "- seniority must be one of Junior, Mid, Senior, Expert, Unknown",
                  "- avoid industries unless they repeat clearly across cases",
                  '- never use words or phrases like "consultant", "specializing in", "leveraging", "solutions", or "dynamic professional"',
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Combined context:",
                  combinedContext,
                  "",
                  `Recurring strategic signals: ${coreCapabilities.join(", ") || "None"}`,
                  `Recurring execution signals: ${functionalSkills.join(", ") || "None"}`,
                  `Industries: ${industries.join(", ") || "None"}`,
                  `Observed seniority: ${seniority}`,
                ].join("\n"),
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;

    if (!response.ok) {
      console.error("IDENTITY SYNTHESIS ERROR:", payload);
      return null;
    }

    return tryParseJson(extractRawText(payload));
  } catch (error) {
    console.error("IDENTITY SYNTHESIS ERROR:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizeIdentity(cases: FreelancerCase[] | null | undefined): Promise<SynthesizedIdentity> {
  if (!cases || cases.length === 0) {
    return {
      positioning: "",
      coreCapabilities: [],
      functionalSkills: [],
      industries: [],
      seniority: "Unknown",
    };
  }

  if (cases.length === 1) {
    const [singleCase] = cases;
    const splitSignalsResult = splitSignals(
      unique(clean(singleCase.capabilities ?? [])),
      unique(clean(singleCase.services ?? [])),
    );

    return {
      positioning:
        normalizePositioning(singleCase.positioning) || "Still defining your pattern. Add more cases.",
      coreCapabilities: splitSignalsResult.coreCapabilities,
      functionalSkills: splitSignalsResult.functionalSkills,
      industries: normalizeList(unique(clean(singleCase.industries ?? [])), 3),
      seniority: singleCase.seniority ?? "Unknown",
    };
  }

  const allCapabilities = clean(cases.flatMap((freelancerCase) => freelancerCase.capabilities || []));
  const allServices = clean(cases.flatMap((freelancerCase) => freelancerCase.services || []));
  const allIndustries = clean(cases.flatMap((freelancerCase) => freelancerCase.industries || []));
  const capabilityCounts = countOccurrences(allCapabilities);
  const serviceCounts = countOccurrences(allServices);
  const industryCounts = countOccurrences(allIndustries);
  const recurringCapabilities = sortByFrequency(capabilityCounts).slice(0, 8);
  const recurringServices = sortByFrequency(serviceCounts).slice(0, 8);
  const splitSignalsResult = splitSignals(recurringCapabilities, recurringServices);
  const coreIndustries = sortByFrequency(industryCounts).slice(0, 3);
  const seniority = pickHighestSeniority(cases);
  const combinedContext = cases.map((freelancerCase) => freelancerCase.rawText ?? "").join("\n\n");
  const fallbackIdentity = {
    positioning:
      buildDeterministicPositioning(splitSignalsResult.coreCapabilities, coreIndustries) ||
      "Still defining your pattern. Add more cases.",
    coreCapabilities: splitSignalsResult.coreCapabilities,
    functionalSkills: splitSignalsResult.functionalSkills,
    industries: coreIndustries,
    seniority,
  };

  const synthesizedIdentity = await fetchSynthesizedIdentity({
    combinedContext,
    coreCapabilities: splitSignalsResult.coreCapabilities,
    functionalSkills: splitSignalsResult.functionalSkills,
    industries: coreIndustries,
    seniority,
  });

  const result = normalizeSynthesizedIdentity(synthesizedIdentity, fallbackIdentity);

  return {
    ...result,
    positioning: result.positioning || "Still defining your pattern. Add more cases.",
  };
}
