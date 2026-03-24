export type CaseExtractionResult = {
  capabilities: string[];
  industries: string[];
  positioning: string;
  services: string[];
  seniority: "Junior" | "Mid" | "Senior" | "Expert";
};

export const caseExtractionSchema = {
  type: "object",
  properties: {
    capabilities: {
      type: "array",
      maxItems: 6,
      items: {
        type: "string",
      },
    },
    industries: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    services: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    seniority: {
      type: "string",
      enum: ["Junior", "Mid", "Senior", "Expert"],
    },
  },
  required: ["capabilities", "industries", "services", "seniority"],
  additionalProperties: false,
} as const;
