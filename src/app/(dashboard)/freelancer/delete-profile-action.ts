"use server";

import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { requireUser } from "../../../lib/auth/requireUser";
import { createAdminSupabaseClient } from "../../../lib/supabase/admin";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import type { TableRow } from "../../../types/database";

function redirectWithError(message: string): never {
  redirect(`/freelancer?error=${encodeURIComponent(message)}`);
}

type CleanupError = {
  code?: string | null;
  message: string;
};

type UntypedDeleteBuilder = {
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: CleanupError | null }>;
  };
};

type UntypedAdminClient = {
  from: (table: string) => UntypedDeleteBuilder;
};

function isIgnorableCleanupError(error: Pick<PostgrestError, "code" | "message"> | CleanupError | null) {
  if (!error) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("not found") ||
    message.includes("schema cache")
  );
}

async function runDelete(
  operation: PromiseLike<{ error: CleanupError | null }>,
  options: {
    ignoreMissing?: boolean;
  } = {},
) {
  const { error } = await operation;

  if (!error) {
    return;
  }

  if (options.ignoreMissing && isIgnorableCleanupError(error)) {
    return;
  }

  throw new Error(error.message);
}

async function readRows<T>(
  operation: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  options: {
    fallback: T;
    ignoreMissing?: boolean;
  },
) {
  const { data, error } = await operation;

  if (!error) {
    return data ?? options.fallback;
  }

  if (options.ignoreMissing && isIgnorableCleanupError(error)) {
    return options.fallback;
  }

  throw new Error(error.message);
}

export async function deleteProfileAction() {
  const user = await requireUser();
  const uid = user.id;
  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();
  const untypedAdmin = adminSupabase as unknown as UntypedAdminClient;

  try {
    const freelancer = await readRows<Pick<TableRow<"freelancers">, "id"> | null>(
      adminSupabase
        .from("freelancers")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle(),
      {
        fallback: null,
        ignoreMissing: true,
      },
    );

    const fid = freelancer?.id ?? null;

    if (fid) {
      const certifications = await readRows<Array<Pick<TableRow<"freelancer_certifications">, "id">>>(
        adminSupabase
          .from("freelancer_certifications")
          .select("id")
          .eq("freelancer_id", fid),
        {
          fallback: [],
          ignoreMissing: true,
        },
      );

      const certificationIds = certifications.map((certification) => certification.id);

      if (certificationIds.length > 0) {
        const certificationFiles = await readRows<Array<TableRow<"certification_files">>>(
          adminSupabase
            .from("certification_files")
            .select("*")
            .in("certification_id", certificationIds),
          {
            fallback: [],
            ignoreMissing: true,
          },
        );

        if (certificationFiles.length > 0) {
          const filesByBucket = certificationFiles.reduce<Map<string, string[]>>((accumulator, file) => {
            const bucketFiles = accumulator.get(file.bucket_name) ?? [];
            bucketFiles.push(file.storage_path);
            accumulator.set(file.bucket_name, bucketFiles);
            return accumulator;
          }, new Map());

          for (const [bucketName, bucketFiles] of filesByBucket.entries()) {
            await runDelete(adminSupabase.storage.from(bucketName).remove(bucketFiles), {
              ignoreMissing: true,
            });
          }

          await runDelete(
            adminSupabase.from("certification_files").delete().in("certification_id", certificationIds),
            {
              ignoreMissing: true,
            },
          );
        }
      }

      await runDelete(
        adminSupabase.from("freelancer_ai_profiles").delete().eq("freelancer_id", fid),
        {
          ignoreMissing: true,
        },
      );
      await runDelete(
        adminSupabase.from("ai_profile_snapshots").delete().eq("freelancer_id", fid),
        {
          ignoreMissing: true,
        },
      );
      await runDelete(adminSupabase.from("freelancer_cases").delete().eq("freelancer_id", fid), {
        ignoreMissing: true,
      });
      await runDelete(
        adminSupabase.from("freelancer_certifications").delete().eq("freelancer_id", fid),
        {
          ignoreMissing: true,
        },
      );
      await runDelete(adminSupabase.from("freelancers").delete().eq("id", fid), {
        ignoreMissing: true,
      });
    }

    await runDelete(untypedAdmin.from("freelancer_private_data").delete().eq("profile_id", uid), {
      ignoreMissing: true,
    });
    await runDelete(adminSupabase.from("profiles").delete().eq("id", uid), {
      ignoreMissing: true,
    });
    await runDelete(adminSupabase.from("profiles").delete().eq("user_id", uid), {
      ignoreMissing: true,
    });
    await runDelete(adminSupabase.from("business_profiles").delete().eq("user_id", uid), {
      ignoreMissing: true,
    });
    await runDelete(adminSupabase.from("matches").delete().eq("freelancer_user_id", uid), {
      ignoreMissing: true,
    });
    await runDelete(adminSupabase.from("matches").delete().eq("business_user_id", uid), {
      ignoreMissing: true,
    });

    const { error: deleteAuthUserError } = await adminSupabase.auth.admin.deleteUser(uid);

    if (deleteAuthUserError) {
      throw new Error(deleteAuthUserError.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete your account.";
    redirectWithError(message);
  }

  await supabase.auth.signOut();
  redirect("/");
}
