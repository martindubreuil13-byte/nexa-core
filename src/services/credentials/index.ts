import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";

export type CredentialFile = {
  contentType: string | null;
  fileName: string;
  id: string;
  publicUrl: string;
  storagePath: string;
};

export type FreelancerCredential = {
  files: CredentialFile[];
  id: string;
  issuingOrganization: string | null;
  title: string;
  year: number | null;
};

export async function getFreelancerCredentials(
  supabase: SupabaseClient<Database>,
  freelancerId: string,
): Promise<FreelancerCredential[]> {
  const { data: certificationData, error: certificationError } = await supabase
    .from("freelancer_certifications")
    .select("*")
    .eq("freelancer_id", freelancerId)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  if (certificationError) {
    throw certificationError;
  }

  const certifications = (certificationData ?? []) as Array<TableRow<"freelancer_certifications">>;

  if (certifications.length === 0) {
    return [];
  }

  const certificationIds = certifications.map((certification) => certification.id);
  const { data: fileData, error: fileError } = await supabase
    .from("certification_files")
    .select("*")
    .in("certification_id", certificationIds)
    .order("created_at", { ascending: false });

  if (fileError) {
    throw fileError;
  }

  const files = (fileData ?? []) as Array<TableRow<"certification_files">>;
  const filesByCertificationId = new Map<string, CredentialFile[]>();

  for (const file of files) {
    const currentFiles = filesByCertificationId.get(file.certification_id) ?? [];
    const publicUrl = supabase.storage.from(file.bucket_name).getPublicUrl(file.storage_path).data
      .publicUrl;

    currentFiles.push({
      id: file.id,
      fileName: file.file_name,
      storagePath: file.storage_path,
      contentType: file.content_type,
      publicUrl,
    });

    filesByCertificationId.set(file.certification_id, currentFiles);
  }

  return certifications.map((certification) => ({
    id: certification.id,
    title: certification.title,
    issuingOrganization: certification.issuing_organization,
    year: certification.year,
    files: filesByCertificationId.get(certification.id) ?? [],
  }));
}
