"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getUserState } from "../../../lib/user/getUserState";

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

  let hasCases = false;

  try {
    const userState = await getUserState();
    hasCases = userState.hasCases;
  } catch (userStateError) {
    console.error("SUPABASE ERROR:", userStateError);
  }

  redirect(hasCases ? "/freelancer" : "/onboarding/case");
}
