export type CaseExtractionResult = {
  capabilities: string[];
  industries: string[];
  positioning: string;
  services: string[];
  seniority: "Junior" | "Mid" | "Senior" | "Expert" | "Unknown";
};

export const caseExtractionSchema = {
  type: "object",
  properties: {
    capabilities: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    industries: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
      },
    },
    services: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    positioning: {
      type: "string",
    },
    seniority: {
      type: "string",
      enum: ["Junior", "Mid", "Senior", "Expert", "Unknown"],
    },
  },
  required: ["capabilities", "industries", "services", "positioning", "seniority"],
  additionalProperties: false,
} as const;
