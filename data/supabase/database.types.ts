export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          anonymized_at: string | null
          claimed_at: string | null
          created_at: string
          id: string
          is_primary: boolean
          kind: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          kind: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          kind?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          byte_size: number | null
          created_at: string
          duration_ms: number | null
          id: string
          kind: string
          mime_type: string | null
          object_key: string | null
          owner_actor_id: string
          ready_at: string | null
          status: string
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind: string
          mime_type?: string | null
          object_key?: string | null
          owner_actor_id: string
          ready_at?: string | null
          status?: string
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          object_key?: string | null
          owner_actor_id?: string
          ready_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          created_at: string
          created_by_actor_id: string
          description: string
          end_mode: string
          ended_at: string | null
          id: string
          location_label: string | null
          planned_ends_at: string | null
          responsible_actor_id: string | null
          revision: number
          room_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_actor_id: string
          description?: string
          end_mode: string
          ended_at?: string | null
          id?: string
          location_label?: string | null
          planned_ends_at?: string | null
          responsible_actor_id?: string | null
          revision?: number
          room_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string
          description?: string
          end_mode?: string
          ended_at?: string | null
          id?: string
          location_label?: string | null
          planned_ends_at?: string | null
          responsible_actor_id?: string | null
          revision?: number
          room_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_responsible_actor_id_fkey"
            columns: ["responsible_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itineraries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      message_pins: {
        Row: {
          message_id: string
          pinned_at: string
          pinned_by_actor_id: string
          room_id: string
        }
        Insert: {
          message_id: string
          pinned_at?: string
          pinned_by_actor_id: string
          room_id: string
        }
        Update: {
          message_id?: string
          pinned_at?: string
          pinned_by_actor_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_pins_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_pins_pinned_by_actor_id_fkey"
            columns: ["pinned_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_pins_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          actor_id: string
          created_at: string
          emoji: string
          message_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          emoji: string
          message_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          emoji?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          asset_id: string | null
          author_actor_id: string
          body: string | null
          client_command_id: string
          created_at: string
          id: string
          kind: string
          moderated_at: string | null
          moderated_by_actor_id: string | null
          recalled_at: string | null
          reply_to_message_id: string | null
          revision: number
          room_id: string
        }
        Insert: {
          asset_id?: string | null
          author_actor_id: string
          body?: string | null
          client_command_id: string
          created_at?: string
          id?: string
          kind: string
          moderated_at?: string | null
          moderated_by_actor_id?: string | null
          recalled_at?: string | null
          reply_to_message_id?: string | null
          revision?: number
          room_id: string
        }
        Update: {
          asset_id?: string | null
          author_actor_id?: string
          body?: string | null
          client_command_id?: string
          created_at?: string
          id?: string
          kind?: string
          moderated_at?: string | null
          moderated_by_actor_id?: string | null
          recalled_at?: string | null
          reply_to_message_id?: string | null
          revision?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_actor_id_fkey"
            columns: ["author_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_moderated_by_actor_id_fkey"
            columns: ["moderated_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          actor_id: string
          body: string
          created_at: string
          id: string
          photo_id: string
          room_id: string
        }
        Insert: {
          actor_id: string
          body: string
          created_at?: string
          id?: string
          photo_id: string
          room_id: string
        }
        Update: {
          actor_id?: string
          body?: string
          created_at?: string
          id?: string
          photo_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          aspect_ratio: number
          asset_id: string
          created_at: string
          id: string
          note: string | null
          original_name: string
          owner_actor_id: string
          room_id: string
        }
        Insert: {
          aspect_ratio: number
          asset_id: string
          created_at?: string
          id?: string
          note?: string | null
          original_name: string
          owner_actor_id: string
          room_id: string
        }
        Update: {
          aspect_ratio?: number
          asset_id?: string
          created_at?: string
          id?: string
          note?: string | null
          original_name?: string
          owner_actor_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymized_at: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          actor_id: string
          archive_eligible: boolean
          joined_at: string
          left_at: string | null
          nickname: string
          removed_at: string | null
          role: string
          room_id: string
          state: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          archive_eligible?: boolean
          joined_at?: string
          left_at?: string | null
          nickname: string
          removed_at?: string | null
          role: string
          room_id: string
          state?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          archive_eligible?: boolean
          joined_at?: string
          left_at?: string | null
          nickname?: string
          removed_at?: string | null
          role?: string
          room_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          archive_started_at: string | null
          archived_at: string | null
          created_at: string
          description: string
          end_reason: string | null
          ended_at: string | null
          ended_by_actor_id: string | null
          ends_at: string
          id: string
          member_limit: number
          member_list_visibility: string
          mode: string
          name: string
          public_id: string
          purge_after: string | null
          requires_approval: boolean
          revision: number
          starts_at: string
          status: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          archive_started_at?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_actor_id?: string | null
          ends_at: string
          id?: string
          member_limit: number
          member_list_visibility?: string
          mode?: string
          name: string
          public_id?: string
          purge_after?: string | null
          requires_approval?: boolean
          revision?: number
          starts_at?: string
          status?: string
          time_zone: string
          updated_at?: string
        }
        Update: {
          archive_started_at?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_actor_id?: string | null
          ends_at?: string
          id?: string
          member_limit?: number
          member_list_visibility?: string
          mode?: string
          name?: string
          public_id?: string
          purge_after?: string | null
          requires_approval?: boolean
          revision?: number
          starts_at?: string
          status?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_ended_by_actor_id_fkey"
            columns: ["ended_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_identity: {
        Args: { requested_display_name: string; requested_theme?: string }
        Returns: {
          actor_id: string
          actor_kind: string
          display_name: string
          is_anonymous: boolean
          profile_user_id: string
          theme: string
        }[]
      }
      change_room_member_state: {
        Args: {
          requested_actor_id: string
          requested_room_public_id: string
          requested_state: string
        }
        Returns: {
          actor_id: string
          member_state: string
        }[]
      }
      create_host_led_room: {
        Args: {
          requested_description: string
          requested_duration_minutes: number
          requested_idempotency_key: string
          requested_member_limit: number
          requested_name: string
          requested_requires_approval: boolean
          requested_time_zone: string
        }
        Returns: {
          actor_id: string
          created: boolean
          public_id: string
          room_id: string
        }[]
      }
      create_itinerary: {
        Args: {
          requested_description: string
          requested_end_mode: string
          requested_idempotency_key: string
          requested_location_label: string
          requested_planned_ends_at: string
          requested_responsible_actor_id: string
          requested_room_public_id: string
          requested_starts_at: string
          requested_title: string
        }
        Returns: {
          itinerary_id: string
          revision: number
        }[]
      }
      create_room_invite: {
        Args: {
          requested_code: string
          requested_room_public_id: string
          requested_token: string
        }
        Returns: {
          invite_revision: number
          public_id: string
          room_id: string
        }[]
      }
      end_host_led_room: {
        Args: {
          requested_idempotency_key: string
          requested_room_public_id: string
        }
        Returns: {
          public_id: string
          revision: number
          room_id: string
          status: string
        }[]
      }
      end_itinerary: {
        Args: {
          requested_expected_revision: number
          requested_itinerary_id: string
        }
        Returns: {
          ended_at: string
          itinerary_id: string
          revision: number
        }[]
      }
      get_current_user_room: {
        Args: { requested_public_id: string }
        Returns: {
          archived_at: string
          description: string
          ends_at: string
          member_count: number
          member_limit: number
          member_list_visibility: string
          mode: string
          name: string
          public_id: string
          requires_approval: boolean
          revision: number
          room_id: string
          starts_at: string
          status: string
          time_zone: string
          updated_at: string
          viewer_actor_id: string
          viewer_archive_eligible: boolean
          viewer_nickname: string
          viewer_role: string
          viewer_state: string
        }[]
      }
      join_room_with_invite: {
        Args: {
          requested_code?: string
          requested_nickname: string
          requested_note?: string
          requested_room_public_id: string
          requested_token?: string
        }
        Returns: {
          actor_id: string
          outcome: string
          public_id: string
          request_id: string
          room_id: string
        }[]
      }
      list_current_user_rooms: {
        Args: {
          requested_cursor_id?: string
          requested_cursor_updated_at?: string
          requested_limit?: number
        }
        Returns: {
          archived_at: string
          description: string
          ends_at: string
          member_count: number
          member_limit: number
          member_list_visibility: string
          mode: string
          name: string
          public_id: string
          requires_approval: boolean
          revision: number
          room_id: string
          starts_at: string
          status: string
          time_zone: string
          updated_at: string
          viewer_actor_id: string
          viewer_archive_eligible: boolean
          viewer_nickname: string
          viewer_role: string
          viewer_state: string
        }[]
      }
      list_pending_join_requests: {
        Args: { requested_room_public_id: string }
        Returns: {
          actor_id: string
          nickname: string
          note: string
          request_id: string
          requested_at: string
        }[]
      }
      pin_room_message: {
        Args: { requested_message_id: string; requested_room_public_id: string }
        Returns: {
          message_id: string
          room_id: string
        }[]
      }
      preview_room_invite: {
        Args: {
          requested_code?: string
          requested_room_public_id: string
          requested_token?: string
        }
        Returns: {
          description: string
          ends_at: string
          invite_revision: number
          member_count: number
          member_limit: number
          name: string
          public_id: string
          requires_approval: boolean
          room_id: string
          time_zone: string
        }[]
      }
      react_to_room_message: {
        Args: {
          requested_active: boolean
          requested_emoji: string
          requested_message_id: string
        }
        Returns: {
          active: boolean
          emoji: string
          message_id: string
        }[]
      }
      recall_room_message: {
        Args: { requested_message_id: string }
        Returns: {
          message_id: string
          recalled_at: string
          revision: number
        }[]
      }
      resolve_room_invite_code: {
        Args: { requested_code: string }
        Returns: {
          description: string
          ends_at: string
          invite_revision: number
          member_count: number
          member_limit: number
          name: string
          public_id: string
          requires_approval: boolean
          room_id: string
          time_zone: string
        }[]
      }
      review_join_request: {
        Args: {
          requested_decision: string
          requested_request_id: string
          requested_room_public_id: string
        }
        Returns: {
          actor_id: string
          membership_state: string
          outcome: string
        }[]
      }
      send_room_message: {
        Args: {
          requested_asset_id: string
          requested_body: string
          requested_idempotency_key: string
          requested_kind: string
          requested_reply_to_message_id: string
          requested_room_public_id: string
        }
        Returns: {
          created_at: string
          message_id: string
          revision: number
        }[]
      }
      update_itinerary: {
        Args: {
          requested_description: string
          requested_end_mode: string
          requested_expected_revision: number
          requested_itinerary_id: string
          requested_location_label: string
          requested_planned_ends_at: string
          requested_responsible_actor_id: string
          requested_starts_at: string
          requested_title: string
        }
        Returns: {
          itinerary_id: string
          revision: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
