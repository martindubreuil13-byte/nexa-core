import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../../types/database";
import { getRequiredEnv } from "../utils/env";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
