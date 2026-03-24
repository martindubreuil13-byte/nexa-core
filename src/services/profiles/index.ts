import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TableRow } from "../../types/database";

type ProfilesService = {
  getProfileByUserId(userId: string): Promise<TableRow<"profiles"> | null>;
  getBusinessProfileByUserId(userId: string): Promise<TableRow<"business_profiles"> | null>;
  getFreelancerProfileByUserId(userId: string): Promise<TableRow<"freelancer_profiles"> | null>;
};

export function createProfilesService(supabase: SupabaseClient<Database>): ProfilesService {
  return {
    async getProfileByUserId(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async getBusinessProfileByUserId(userId) {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async getFreelancerProfileByUserId(userId) {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  };
}
