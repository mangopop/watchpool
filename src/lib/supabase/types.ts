// Hand-written to match supabase/migrations/20260913000000_init.sql.
// Once the project is live, regenerate from the real schema with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type ReactionStatus = "want" | "watched" | "skip";
export type ReactionTier = "loved" | "liked" | "meh" | "miss";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          role?: "admin" | "member";
        };
      };
      group_invites: {
        Row: {
          code: string;
          group_id: string;
          created_by: string;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          code?: string;
          group_id: string;
          created_by: string;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: never;
      };
      movies: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          pitch: string;
          recommended_by: string;
          date_added: string;
          revived: boolean;
          plea: string | null;
          bumped_by: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          pitch: string;
          recommended_by: string;
          date_added?: string;
          revived?: boolean;
          plea?: string | null;
          bumped_by?: string | null;
        };
        Update: {
          title?: string;
          pitch?: string;
          revived?: boolean;
          plea?: string | null;
          bumped_by?: string | null;
        };
      };
      reactions: {
        Row: {
          movie_id: string;
          user_id: string;
          status: ReactionStatus | null;
          rating: ReactionTier | null;
          note: string | null;
          note_dismissed: boolean;
          updated_at: string;
        };
        Insert: {
          movie_id: string;
          user_id: string;
          status?: ReactionStatus | null;
          rating?: ReactionTier | null;
          note?: string | null;
          note_dismissed?: boolean;
          updated_at?: string;
        };
        Update: {
          status?: ReactionStatus | null;
          rating?: ReactionTier | null;
          note?: string | null;
          note_dismissed?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
