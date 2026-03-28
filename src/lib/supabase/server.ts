import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "../../types/database";
import { getRequiredEnv } from "../utils/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set({
                name,
                value,
                ...options,
              });
            });
          } catch {
            // Server Components cannot always mutate cookies directly.
          }
        },
      },
    },
  );
}

export const createServerSupabaseClient = createClient;
