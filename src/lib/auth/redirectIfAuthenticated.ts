import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getUser } from "./getUser";

function getAuthenticatedRedirectPath(_user: User) {
  return "/freelancer";
}

export async function redirectIfAuthenticated() {
  const user = await getUser();

  if (!user) {
    return;
  }

  redirect(getAuthenticatedRedirectPath(user));
}
