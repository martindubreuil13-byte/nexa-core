import "server-only";

import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "../supabase/server";

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
