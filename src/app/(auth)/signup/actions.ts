"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getUserState } from "../../../lib/user/getUserState";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData) {
  const fullName = getStringValue(formData.get("fullName"));
  const email = getStringValue(formData.get("email")).toLowerCase();
  const password = getStringValue(formData.get("password"));

  if (!fullName || !email || !password) {
    redirectWithError("Please complete all fields.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirectWithError(error.message);
  }

  let hasCases = false;

  try {
    const userState = await getUserState();
    hasCases = userState.hasCases;
  } catch (userStateError) {
    console.error("SUPABASE ERROR:", userStateError);
  }

  redirect(hasCases ? "/freelancer" : "/onboarding/case");
}
