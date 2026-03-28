import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database";
import { getRequiredEnv } from "../utils/env";

export function createAdminSupabaseClient() {
  return createClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
