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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Update: Record<string, never>;
        Relationships: [];
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
          tmdb_id: number | null;
          poster_path: string | null;
          release_year: number | null;
          runtime_minutes: number | null;
          tmdb_rating: number | null;
          media_type: "movie" | "tv";
          genres: string[];
          trailer_key: string | null;
          age_rating: string | null;
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
          tmdb_id?: number | null;
          poster_path?: string | null;
          release_year?: number | null;
          runtime_minutes?: number | null;
          tmdb_rating?: number | null;
          media_type?: "movie" | "tv";
          genres?: string[];
          trailer_key?: string | null;
          age_rating?: string | null;
        };
        Update: {
          title?: string;
          pitch?: string;
          revived?: boolean;
          plea?: string | null;
          bumped_by?: string | null;
          tmdb_id?: number | null;
          poster_path?: string | null;
          release_year?: number | null;
          runtime_minutes?: number | null;
          tmdb_rating?: number | null;
          media_type?: "movie" | "tv";
          genres?: string[];
          trailer_key?: string | null;
          age_rating?: string | null;
        };
        Relationships: [];
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
        Relationships: [];
      };
      user_services: {
        Row: {
          user_id: string;
          service_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          service_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group: {
        Args: { group_name: string };
        Returns: Database["public"]["Tables"]["groups"]["Row"];
      };
      join_group: {
        Args: { invite_code: string };
        Returns: Database["public"]["Tables"]["groups"]["Row"];
      };
    };
  };
}
