/**
 * Shared TypeScript types for the Resume Matcher app.
 */

// ---------------------------------------------------------------------------
// Supabase Database schema
// Inlined column definitions (not references to interfaces) so Supabase's
// internal conditional types resolve correctly instead of collapsing to never.
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string;
          user_id: string;
          resume_text: string;
          jd_text: string;
          score: number;
          matched_skills: string[];
          missing_skills: string[];
          summary: string;
          inserted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resume_text: string;
          jd_text: string;
          score: number;
          matched_skills: string[];
          missing_skills: string[];
          summary: string;
          inserted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          resume_text?: string;
          jd_text?: string;
          score?: number;
          matched_skills?: string[];
          missing_skills?: string[];
          summary?: string;
          inserted_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          daily_count: number;
          last_reset: string;
        };
        Insert: {
          id?: string;
          email: string;
          daily_count?: number;
          last_reset?: string;
        };
        Update: {
          id?: string;
          email?: string;
          daily_count?: number;
          last_reset?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
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
  inserted_at: string;
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
