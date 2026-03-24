import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";

type MatchingService = {
  getBusinessMatches(businessUserId: string): Promise<Array<TableRow<"matches">>>;
  getFreelancerMatches(freelancerUserId: string): Promise<Array<TableRow<"matches">>>;
};

export function createMatchingService(supabase: SupabaseClient<Database>): MatchingService {
  return {
    async getBusinessMatches(businessUserId) {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("business_user_id", businessUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },

    async getFreelancerMatches(freelancerUserId) {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("freelancer_user_id", freelancerUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  };
}
