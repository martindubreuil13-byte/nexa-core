import "server-only";

import OpenAI from "openai";

import { getRequiredEnv } from "../utils/env";

let openAIClient: OpenAI | undefined;

export function getOpenAIClient() {
  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
      timeout: 30_000,
    });
  }

  return openAIClient;
}
