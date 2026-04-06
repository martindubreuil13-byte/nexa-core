import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import {
  analyzeCredentialFile,
  CredentialUploadError,
} from "../../../../services/credentials/uploadCredential";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CONFIDENCE_REASON = "Document structure partially recognized";
const FALLBACK_CONFIDENCE_REASON = "Some fields may require manual verification";

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
    const credential = await analyzeCredentialFile(fileValue);

    return NextResponse.json(
      {
        success: true,
        analysis: {
          title: credential.title,
          issuer: credential.issuer,
          issue_date: credential.issueDate,
          summary: credential.summary,
          confidence_score: credential.confidenceScore,
          confidence_level: credential.confidenceLevel,
          confidence_reason: ensureConfidenceReasons(credential.confidenceReason),
          flags: credential.flags,
        },
      },
      { status: 200 },
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
        error: "Unable to analyze the credential right now.",
      },
      { status: 500 },
    );
  }
}

function ensureConfidenceReasons(reasons: string[]) {
  let confidenceReason = Array.isArray(reasons)
    ? reasons
        .map((reason) => reason.trim())
        .filter(Boolean)
    : [];

  if (confidenceReason.length < 2) {
    confidenceReason = [DEFAULT_CONFIDENCE_REASON, FALLBACK_CONFIDENCE_REASON];
  }

  return confidenceReason;
}
