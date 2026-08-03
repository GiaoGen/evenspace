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
          image_height: number | null
          image_width: number | null
          kind: string
          media_revision: number
          mime_type: string | null
          object_key: string | null
          owner_actor_id: string
          placeholder_data_url: string | null
          ready_at: string | null
          status: string
          thumbnail_byte_size: number | null
          thumbnail_object_key: string | null
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          kind: string
          media_revision?: number
          mime_type?: string | null
          object_key?: string | null
          owner_actor_id: string
          placeholder_data_url?: string | null
          ready_at?: string | null
          status?: string
          thumbnail_byte_size?: number | null
          thumbnail_object_key?: string | null
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          kind?: string
          media_revision?: number
          mime_type?: string | null
          object_key?: string | null
          owner_actor_id?: string
          placeholder_data_url?: string | null
          ready_at?: string | null
          status?: string
          thumbnail_byte_size?: number | null
          thumbnail_object_key?: string | null
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
          avatar_asset_id: string | null
          avatar_variant: string
          created_at: string
          deleted_at: string | null
          display_name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymized_at?: string | null
          avatar_asset_id?: string | null
          avatar_variant?: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymized_at?: string | null
          avatar_asset_id?: string | null
          avatar_variant?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          actor_id: string
          archive_eligible: boolean
          avatar_asset_id: string | null
          avatar_variant: string
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
          avatar_asset_id?: string | null
          avatar_variant?: string
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
          avatar_asset_id?: string | null
          avatar_variant?: string
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
            foreignKeyName: "room_members_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
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
      zine_draft_photos: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          ordinal: number
          reflection_body: string | null
          room_photo_id: string | null
          text_kind: string
          updated_at: string
          upload_id: string | null
          zine_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          ordinal: number
          reflection_body?: string | null
          room_photo_id?: string | null
          text_kind?: string
          updated_at?: string
          upload_id?: string | null
          zine_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          ordinal?: number
          reflection_body?: string | null
          room_photo_id?: string | null
          text_kind?: string
          updated_at?: string
          upload_id?: string | null
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_draft_photos_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "photo_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_draft_photos_room_photo_id_fkey"
            columns: ["room_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_draft_photos_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "zine_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_draft_photos_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_generation_jobs: {
        Row: {
          attempt_count: number
          created_at: string
          error_code: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          kind: string
          model: string | null
          prompt_version: string | null
          provider: string | null
          requested_by_user_id: string | null
          source_id: string
          stage: string
          started_at: string | null
          status: string
          updated_at: string
          zine_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          kind: string
          model?: string | null
          prompt_version?: string | null
          provider?: string | null
          requested_by_user_id?: string | null
          source_id: string
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          zine_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          model?: string | null
          prompt_version?: string | null
          provider?: string | null
          requested_by_user_id?: string | null
          source_id?: string
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_generation_jobs_source_same_zine"
            columns: ["zine_id", "source_id"]
            isOneToOne: false
            referencedRelation: "zine_sources"
            referencedColumns: ["zine_id", "id"]
          },
          {
            foreignKeyName: "zine_generation_jobs_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_source_photos: {
        Row: {
          alt_text: string
          asset_id: string
          captured_at: string | null
          created_at: string
          height: number
          id: string
          ordinal: number
          original_asset_id: string | null
          original_name: string
          original_photo_id: string | null
          source_id: string
          width: number
        }
        Insert: {
          alt_text: string
          asset_id: string
          captured_at?: string | null
          created_at?: string
          height: number
          id?: string
          ordinal: number
          original_asset_id?: string | null
          original_name: string
          original_photo_id?: string | null
          source_id: string
          width: number
        }
        Update: {
          alt_text?: string
          asset_id?: string
          captured_at?: string | null
          created_at?: string
          height?: number
          id?: string
          ordinal?: number
          original_asset_id?: string | null
          original_name?: string
          original_photo_id?: string | null
          source_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "zine_source_photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_source_photos_original_asset_id_fkey"
            columns: ["original_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_source_photos_original_photo_id_fkey"
            columns: ["original_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_source_photos_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "zine_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_source_texts: {
        Row: {
          author_display_name: string | null
          body: string
          created_at: string
          id: string
          kind: string
          original_comment_id: string | null
          source_photo_id: string
        }
        Insert: {
          author_display_name?: string | null
          body: string
          created_at?: string
          id?: string
          kind: string
          original_comment_id?: string | null
          source_photo_id: string
        }
        Update: {
          author_display_name?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          original_comment_id?: string | null
          source_photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_source_texts_original_comment_id_fkey"
            columns: ["original_comment_id"]
            isOneToOne: false
            referencedRelation: "photo_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_source_texts_source_photo_id_fkey"
            columns: ["source_photo_id"]
            isOneToOne: true
            referencedRelation: "zine_source_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_sources: {
        Row: {
          chapter_basis: string
          consent_version: string
          created_at: string
          frozen_at: string | null
          id: string
          photo_count: number
          room_revision: number | null
          schema_version: number
          status: string
          zine_id: string
        }
        Insert: {
          chapter_basis: string
          consent_version: string
          created_at?: string
          frozen_at?: string | null
          id?: string
          photo_count?: number
          room_revision?: number | null
          schema_version?: number
          status?: string
          zine_id: string
        }
        Update: {
          chapter_basis?: string
          consent_version?: string
          created_at?: string
          frozen_at?: string | null
          id?: string
          photo_count?: number
          room_revision?: number | null
          schema_version?: number
          status?: string
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_sources_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_uploads: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          idempotency_key: string
          ready_at: string | null
          status: string
          zine_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          ready_at?: string | null
          status?: string
          zine_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          ready_at?: string | null
          status?: string
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_uploads_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zine_uploads_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_usage_ledger: {
        Row: {
          cost_micros: number
          created_at: string
          id: string
          job_id: string
          metric: string
          provider_request_id: string
          quantity: number
        }
        Insert: {
          cost_micros?: number
          created_at?: string
          id?: string
          job_id: string
          metric: string
          provider_request_id: string
          quantity: number
        }
        Update: {
          cost_micros?: number
          created_at?: string
          id?: string
          job_id?: string
          metric?: string
          provider_request_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "zine_usage_ledger_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "zine_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      zine_versions: {
        Row: {
          created_at: string
          failure_code: string | null
          id: string
          is_current: boolean
          layout_document: Json | null
          ready_at: string | null
          source_id: string
          status: string
          style: string
          template_id: string
          version_number: number
          zine_id: string
        }
        Insert: {
          created_at?: string
          failure_code?: string | null
          id?: string
          is_current?: boolean
          layout_document?: Json | null
          ready_at?: string | null
          source_id: string
          status?: string
          style: string
          template_id: string
          version_number: number
          zine_id: string
        }
        Update: {
          created_at?: string
          failure_code?: string | null
          id?: string
          is_current?: boolean
          layout_document?: Json | null
          ready_at?: string | null
          source_id?: string
          status?: string
          style?: string
          template_id?: string
          version_number?: number
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zine_versions_source_same_zine"
            columns: ["zine_id", "source_id"]
            isOneToOne: false
            referencedRelation: "zine_sources"
            referencedColumns: ["zine_id", "id"]
          },
          {
            foreignKeyName: "zine_versions_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      zines: {
        Row: {
          created_at: string
          created_by_actor_id: string | null
          deleted_at: string | null
          id: string
          kind: string
          owner_user_id: string | null
          public_id: string
          room_id: string | null
          status: string
          style: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          id?: string
          kind: string
          owner_user_id?: string | null
          public_id?: string
          room_id?: string | null
          status?: string
          style: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by_actor_id?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          owner_user_id?: string | null
          public_id?: string
          room_id?: string | null
          status?: string
          style?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "zines_created_by_actor_id_fkey"
            columns: ["created_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zines_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_photo_comment: {
        Args: { requested_body: string; requested_photo_id: string }
        Returns: {
          comment_id: string
          created_at: string
        }[]
      }
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
      create_room_photo: {
        Args: {
          requested_aspect_ratio: number
          requested_asset_id: string
          requested_original_name: string
          requested_room_public_id: string
        }
        Returns: {
          created_at: string
          photo_id: string
        }[]
      }
      create_zine_draft: {
        Args: {
          requested_idempotency_key: string
          requested_kind: string
          requested_room_public_id: string
          requested_style: string
          requested_title: string
        }
        Returns: {
          created: boolean
          kind: string
          public_id: string
          status: string
          zine_id: string
        }[]
      }
      delete_room_photo: {
        Args: { requested_photo_id: string }
        Returns: {
          asset_id: string
          object_key: string
          photo_id: string
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
      enqueue_zine_generation: {
        Args: {
          requested_idempotency_key: string
          requested_kind: string
          requested_source_id: string
          requested_zine_public_id: string
        }
        Returns: {
          attempt_count: number
          job_id: string
          retried: boolean
          status: string
        }[]
      }
      finalize_profile_avatar_upload: {
        Args: { requested_asset_id: string }
        Returns: {
          asset_id: string
          object_key: string
        }[]
      }
      finalize_room_media_upload: {
        Args: { requested_asset_id: string }
        Returns: {
          asset_id: string
          byte_size: number
          duration_ms: number
          kind: string
          mime_type: string
          object_key: string
        }[]
      }
      finalize_room_media_upload_v2: {
        Args: { requested_asset_id: string }
        Returns: {
          asset_id: string
          byte_size: number
          mime_type: string
          object_key: string
          placeholder_data_url: string
          thumbnail_byte_size: number
          thumbnail_object_key: string
        }[]
      }
      finalize_zine_photo_upload: {
        Args: { requested_upload_id: string }
        Returns: {
          asset_id: string
          status: string
          upload_id: string
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
      get_join_request_status: {
        Args: { requested_request_id: string; requested_room_public_id: string }
        Returns: {
          request_status: string
        }[]
      }
      get_zine_asset_path: {
        Args: { requested_asset_id: string; requested_zine_public_id: string }
        Returns: {
          bucket_id: string
          object_key: string
        }[]
      }
      get_zine_studio: {
        Args: { requested_zine_public_id: string }
        Returns: Json
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
      join_room_with_profile: {
        Args: {
          requested_avatar_asset_id?: string
          requested_avatar_variant?: string
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
      list_pending_join_requests_with_avatar: {
        Args: { requested_room_public_id: string }
        Returns: {
          actor_id: string
          avatar_asset_id: string
          avatar_variant: string
          nickname: string
          note: string
          request_id: string
          requested_at: string
        }[]
      }
      list_room_card_media: {
        Args: { requested_room_ids: string[] }
        Returns: {
          aspect_ratio: number
          asset_id: string
          byte_size: number
          created_at: string
          image_height: number
          image_width: number
          kind: string
          media_revision: number
          mime_type: string
          note: string
          object_key: string
          original_name: string
          owner_actor_id: string
          photo_count: number
          photo_id: string
          placeholder_data_url: string
          room_id: string
          status: string
          thumbnail_byte_size: number
          thumbnail_object_key: string
        }[]
      }
      pin_room_message: {
        Args: { requested_message_id: string; requested_room_public_id: string }
        Returns: {
          message_id: string
          room_id: string
        }[]
      }
      prepare_profile_avatar_upload: {
        Args: { requested_byte_size: number; requested_mime_type: string }
        Returns: {
          asset_id: string
          object_key: string
        }[]
      }
      prepare_room_media_upload: {
        Args: {
          requested_byte_size: number
          requested_duration_ms?: number
          requested_kind: string
          requested_mime_type: string
          requested_room_public_id: string
        }
        Returns: {
          asset_id: string
          object_key: string
        }[]
      }
      prepare_room_media_upload_v2: {
        Args: {
          requested_display_byte_size: number
          requested_image_height: number
          requested_image_width: number
          requested_placeholder_data_url: string
          requested_room_public_id: string
          requested_thumbnail_byte_size: number
        }
        Returns: {
          asset_id: string
          object_key: string
          thumbnail_object_key: string
        }[]
      }
      prepare_zine_photo_upload: {
        Args: {
          requested_display_byte_size: number
          requested_idempotency_key: string
          requested_image_height: number
          requested_image_width: number
          requested_placeholder_data_url: string
          requested_thumbnail_byte_size: number
          requested_zine_public_id: string
        }
        Returns: {
          asset_id: string
          object_key: string
          thumbnail_object_key: string
          upload_id: string
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
      publish_zine_deterministic: {
        Args: {
          requested_chapter_basis: string
          requested_layout_document: Json
          requested_zine_public_id: string
        }
        Returns: {
          status: string
          version_id: string
          version_number: number
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
      save_zine_manual_draft: {
        Args: {
          requested_photos: Json
          requested_style: string
          requested_title: string
          requested_zine_public_id: string
        }
        Returns: {
          selected_count: number
          updated_at: string
          zine_id: string
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
