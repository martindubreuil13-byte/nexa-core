import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getUser } from "./getUser";

type RequireUserOptions = {
  redirectTo?: string;
};

export async function requireUser(options: RequireUserOptions = {}): Promise<User> {
  const user = await getUser();

  if (!user) {
    redirect(options.redirectTo ?? "/login");
  }

  return user;
}
