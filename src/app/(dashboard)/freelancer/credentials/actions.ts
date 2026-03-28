"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "../../../../lib/auth/requireUser";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { getUserState } from "../../../../lib/user/getUserState";
import type { TableRow } from "../../../../types/database";

const CERTIFICATION_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CERTIFICATION_BUCKET ?? "certification-files";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "credential";
}

function getFileExtension(fileName: string) {
  const segments = fileName.split(".");
  return segments.length > 1 ? segments.pop()?.toLowerCase() ?? "" : "";
}

function redirectWithError(message: string): never {
  redirect(`/freelancer/credentials?error=${encodeURIComponent(message)}`);
}

export async function uploadCredentialAction(formData: FormData) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { freelancer, hasCases } = await getUserState();

  if (!freelancer || !hasCases) {
    redirectWithError("Add your first case before uploading credentials.");
  }

  const title = getStringValue(formData.get("title"));
  const issuingOrganization = getStringValue(formData.get("issuingOrganization"));
  const yearValue = getStringValue(formData.get("year"));
  const fileValue = formData.get("file");

  if (!title || !issuingOrganization || !yearValue || !(fileValue instanceof File) || fileValue.size === 0) {
    redirectWithError("Please complete every field and attach a file.");
  }

  if (!/^\d{4}$/.test(yearValue)) {
    redirectWithError("Please enter a valid year.");
  }

  if (fileValue.size > MAX_UPLOAD_SIZE_BYTES) {
    redirectWithError("Please upload a file smaller than 10 MB.");
  }

  if (!(fileValue.type === "application/pdf" || fileValue.type.startsWith("image/"))) {
    redirectWithError("Please upload a PDF or image file.");
  }

  const fileExtension = getFileExtension(fileValue.name);
  const createdAt = new Date().toISOString();
  const storagePath = `${freelancer.id}/${Date.now()}-${sanitizeSlug(title)}${fileExtension ? `.${fileExtension}` : ""}`;
  const uploadResult = await supabase.storage
    .from(CERTIFICATION_STORAGE_BUCKET)
    .upload(storagePath, fileValue, {
      cacheControl: "3600",
      contentType: fileValue.type || undefined,
      upsert: false,
    });

  if (uploadResult.error) {
    redirectWithError(uploadResult.error.message);
  }

  const { data: certificationData, error: certificationError } = await supabase
    .from("freelancer_certifications")
    .insert({
      freelancer_id: freelancer.id,
      title,
      issuing_organization: issuingOrganization,
      year: Number(yearValue),
      created_at: createdAt,
    } as never)
    .select("*")
    .single();

  if (certificationError) {
    redirectWithError(certificationError.message);
  }

  const certification = certificationData as TableRow<"freelancer_certifications"> | null;

  if (!certification) {
    redirectWithError("Unable to save your credential.");
  }

  const { error: certificationFileError } = await supabase
    .from("certification_files")
    .insert({
      certification_id: certification.id,
      bucket_name: CERTIFICATION_STORAGE_BUCKET,
      storage_path: uploadResult.data.path,
      file_name: fileValue.name,
      content_type: fileValue.type || null,
      file_size: fileValue.size,
      created_at: createdAt,
    } as never);

  if (certificationFileError) {
    redirectWithError(certificationFileError.message);
  }

  revalidatePath("/freelancer");
  revalidatePath("/freelancer/credentials");
  redirect("/freelancer/credentials?success=1");
}
