export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: "business" | "freelancer" | "admin";
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "business" | "freelancer" | "admin";
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "business" | "freelancer" | "admin";
          created_at?: string;
          updated_at?: string | null;
        };
      };
      business_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      freelancer_profiles: {
        Row: {
          id: string;
          user_id: string;
          headline: string | null;
          country: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          headline?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          headline?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          business_user_id: string;
          freelancer_user_id: string;
          score: number | null;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_user_id: string;
          freelancer_user_id: string;
          score?: number | null;
          status: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_user_id?: string;
          freelancer_user_id?: string;
          score?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ai_profile_snapshots: {
        Row: {
          id: string;
          freelancer_id: string;
          summary: string | null;
          capabilities: string[] | null;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          freelancer_id: string;
          summary?: string | null;
          capabilities?: string[] | null;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          freelancer_id?: string;
          summary?: string | null;
          capabilities?: string[] | null;
          is_current?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableName = keyof Database["public"]["Tables"];

export type TableRow<TTable extends TableName> = Database["public"]["Tables"][TTable]["Row"];
export type TableInsert<TTable extends TableName> = Database["public"]["Tables"][TTable]["Insert"];
export type TableUpdate<TTable extends TableName> = Database["public"]["Tables"][TTable]["Update"];
