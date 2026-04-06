import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";
import { normalizeStringArray } from "./normalizeCredential";

export type StoredCredential = {
  aiSummary: string;
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string[];
  confidenceScore: number;
  filePath: string;
  flags: string[];
  id: string;
  issueDate: string | null;
  issuer: string;
  skills: string[];
  title: string;
  type: string | null;
  userDecision: string;
};

export async function getStoredCredentials(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StoredCredential[]> {
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const credentials = (data ?? []) as Array<TableRow<"credentials">>;
  const normalizedRows = credentials.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    issuer: row.issuer ?? "",
    issueDate: row.issue_date ?? null,
    type: row.type ?? "other",
    aiSummary: typeof row.ai_summary === "string" ? row.ai_summary : "",
    confidenceScore: typeof row.ai_confidence_score === "number" ? row.ai_confidence_score : 0,
    confidenceLevel:
      row.confidence_level === "high" ||
      row.confidence_level === "medium" ||
      row.confidence_level === "low"
        ? row.confidence_level
        : "low",
    confidenceReason: normalizeStringArray(row.confidence_reason),
    filePath: row.file_path,
    flags: normalizeStringArray(row.flags),
    skills: normalizeStringArray(row.skills),
    userDecision: row.user_decision ?? "pending",
  }));

  console.log("normalized credentials rows", normalizedRows);

  return normalizedRows;
}
