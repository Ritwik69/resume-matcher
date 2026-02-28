/**
 * Shared TypeScript types for the Resume Matcher app.
 */

// ---------------------------------------------------------------------------
// Supabase Database schema
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: Analysis;
        Insert: Omit<Analysis, "id" | "created_at">;
        Update: Partial<Omit<Analysis, "id">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id">;
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
    };
    // Required stubs — match the exact shape supabase gen types produces for empty schemas.
    // { [_ in never]: never } (empty mapped type) avoids the string index signature that
    // Record<string, never> adds, which was causing Supabase's internal type resolution
    // to cascade to `never` for all table Insert/Row lookups.
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};

// ---------------------------------------------------------------------------
// Table row types
// ---------------------------------------------------------------------------

export interface Analysis {
  id: string;
  user_id: string;
  resume_text: string;
  jd_text: string;
  /** Integer 0-100 */
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  summary: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  /** Number of analyses run today (resets at midnight) */
  daily_count: number;
  last_reset: string;
}

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

/** Shape returned by POST /api/analyze */
export interface AnalyzeResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  /** True if the tailored resume PDF was successfully emailed to the user. */
  emailSent: boolean;
}

/** Shape Claude is expected to return (parsed from JSON response) */
export interface ClaudeAnalysis {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  summary: string;
}
