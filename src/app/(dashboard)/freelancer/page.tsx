export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore } from "next/cache";

import { requireUser } from "../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { buildWorkspaceIdentity, getFreelancerCases } from "../../../services/cases";
import { getStoredCredentials } from "../../../services/credentials";
import { WorkspaceContent } from "./workspace-content";

export default async function FreelancerDashboardPage() {
  const authUser = await requireUser();
  const supabase = await createServerSupabaseClient();
  const cases = await getFreelancerCases(supabase, authUser.id);
  const credentials = await getStoredCredentials(supabase, authUser.id);

  unstable_noStore();

  const identity = mergeCredentialSignals(await buildWorkspaceIdentity(cases), credentials);

  return (
    <WorkspaceContent
      initialCases={cases}
      initialCredentials={credentials}
      initialIdentity={identity}
    />
  );
}

function mergeCredentialSignals(
  identity: Awaited<ReturnType<typeof buildWorkspaceIdentity>>,
  credentials: Awaited<ReturnType<typeof getStoredCredentials>>,
) {
  const credentialSkills = credentials.flatMap((credential) => credential.skills);
  const mergedFunctionalSkills = Array.from(
    new Set([...identity.functionalSkills, ...credentialSkills.map((skill) => skill.trim()).filter(Boolean)]),
  );

  return {
    ...identity,
    functionalSkills: mergedFunctionalSkills,
  };
}
