"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "../../../lib/supabase/server";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();
  const password = getStringValue(formData.get("password"));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const hasCases = false;

  redirect(hasCases ? "/freelancer" : "/onboarding/case");
}
