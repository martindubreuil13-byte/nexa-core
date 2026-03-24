import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";

type AIService = {
  generateFreelancerProfile(freelancerId: string): Promise<unknown>;
  getLatestFreelancerProfileSnapshot(
    freelancerId: string,
  ): Promise<TableRow<"ai_profile_snapshots"> | null>;
};

export function createAIService(supabase: SupabaseClient<Database>): AIService {
  return {
    async generateFreelancerProfile(freelancerId) {
      const { data, error } = await supabase.functions.invoke("generate-ai-profile", {
        body: { freelancer_id: freelancerId },
      });

      if (error) throw error;
      return data;
    },

    async getLatestFreelancerProfileSnapshot(freelancerId) {
      const { data, error } = await supabase
        .from("ai_profile_snapshots")
        .select("*")
        .eq("freelancer_id", freelancerId)
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  };
}
