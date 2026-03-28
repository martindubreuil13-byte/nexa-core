export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore } from "next/cache";

import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { buildWorkspaceIdentity, getFreelancerCases } from "../../../services/cases";
import { WorkspaceContent } from "./workspace-content";

export default async function FreelancerDashboardPage() {
  const authUser = await requireUser();
  const supabase = await createServerSupabaseClient();
  const cases = await getFreelancerCases(supabase, authUser.id);

  unstable_noStore();

  const identity = await buildWorkspaceIdentity(cases);

  return <WorkspaceContent initialCases={cases} initialIdentity={identity} />;
}
