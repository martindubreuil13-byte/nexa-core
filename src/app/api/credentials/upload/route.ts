import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import {
  CredentialUploadError,
  saveCredential,
  type CredentialAnalysisDraft,
} from "../../../../services/credentials/uploadCredential";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json(
      {
        success: false,
        error: authError.message,
      },
      { status: 401 },
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "The request must include a file field.",
      },
      { status: 400 },
    );
  }

  try {
    const credential = await saveCredential({
      draft: getDraftFromFormData(formData),
      file: fileValue,
      supabase,
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        credential,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CredentialUploadError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to upload the credential right now.",
      },
      { status: 500 },
    );
  }
}

function getDraftFromFormData(formData: FormData): Partial<CredentialAnalysisDraft> {
  const confidenceScoreValue = formData.get("confidence_score");
  const parsedConfidenceScore =
    typeof confidenceScoreValue === "string" && confidenceScoreValue.trim()
      ? Number(confidenceScoreValue)
      : undefined;

  return {
    extractedText: getFormString(formData, "extracted_text"),
    title: getFormString(formData, "title"),
    issuer: getNullableFormString(formData, "issuer"),
    issueDate: getNullableFormString(formData, "issue_date"),
    type: getFormString(formData, "type"),
    skills: getStringList(formData, "skills"),
    summary: getFormString(formData, "summary"),
    confidenceScore: Number.isFinite(parsedConfidenceScore) ? parsedConfidenceScore : undefined,
    confidenceLevel: getNullableConfidenceLevel(formData.get("confidence_level")),
    confidenceReason: getStringList(formData, "confidence_reason"),
    flags: getStringList(formData, "flags"),
    userDecision: "approved",
  };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableFormString(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  return value || null;
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function getNullableConfidenceLevel(value: FormDataEntryValue | null) {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return undefined;
}
