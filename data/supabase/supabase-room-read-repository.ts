import "server-only";

import { z } from "zod";

import {
  parseActorId,
  parseRoomId,
  parseRoomPublicId,
  type RoomPublicId,
} from "@/core/domain/ids";
import type {
  RoomReadCursor,
  RoomReadModel,
  RoomReadPage,
  RoomReadRepository,
} from "@/data/contracts/room-read-repository";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import type { Database } from "@/data/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const cursorSchema = z.object({
  updatedAt: z.string().min(1),
  roomId: z.string().uuid(),
});

const roomReadRowSchema = z.object({
  room_id: z.string().uuid(),
  public_id: z.string().regex(/^room_[a-z0-9_]{3,40}$/),
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  mode: z.literal("host-led"),
  status: z.enum([
    "active",
    "freezing",
    "archiving",
    "archived",
    "purge_pending",
  ]),
  time_zone: z.string().min(1).max(64),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  archived_at: z.string().nullable(),
  member_limit: z.number().int().min(2),
  requires_approval: z.boolean(),
  member_list_visibility: z.enum(["members", "host"]),
  revision: z.number().int().positive(),
  updated_at: z.string().min(1),
  viewer_actor_id: z.string().uuid(),
  viewer_nickname: z.string().min(1).max(60),
  viewer_role: z.enum(["host", "member"]),
  viewer_state: z.enum(["active", "muted"]),
  viewer_archive_eligible: z.boolean(),
  viewer_is_favorite: z.boolean(),
  member_count: z.number().int().nonnegative(),
});

export type RoomReadErrorCode =
  | "invalid_input"
  | "authentication_required"
  | "read_unavailable";

const safeMessages: Record<RoomReadErrorCode, string> = {
  invalid_input: "The room read request is invalid.",
  authentication_required: "Sign in to view your rooms.",
  read_unavailable: "Rooms are temporarily unavailable.",
};

export class RoomReadError extends Error {
  readonly code: RoomReadErrorCode;

  constructor(code: RoomReadErrorCode) {
    super(safeMessages[code]);
    this.name = "RoomReadError";
    this.code = code;
  }
}

function mapRpcError(error: {
  readonly code?: string;
  readonly message?: string;
}): RoomReadError {
  if (error.message === "authentication_required" || error.code === "42501") {
    return new RoomReadError("authentication_required");
  }

  if (error.code === "22023") {
    return new RoomReadError("invalid_input");
  }

  return new RoomReadError("read_unavailable");
}

function mapRow(input: unknown): RoomReadModel {
  const parsed = roomReadRowSchema.safeParse(input);

  if (!parsed.success) {
    throw new RoomReadError("read_unavailable");
  }

  const row = parsed.data;
  const id = parseRoomId(row.room_id);
  const publicId = parseRoomPublicId(row.public_id);
  const actorId = parseActorId(row.viewer_actor_id);

  if (!id || !publicId || !actorId) {
    throw new RoomReadError("read_unavailable");
  }

  return {
    id,
    publicId,
    name: row.name,
    description: row.description,
    mode: row.mode,
    status: row.status,
    timeZone: row.time_zone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    archivedAt: row.archived_at,
    memberLimit: row.member_limit,
    requiresApproval: row.requires_approval,
    memberListVisibility: row.member_list_visibility,
    revision: row.revision,
    updatedAt: row.updated_at,
    memberCount: row.member_count,
    viewer: {
      actorId,
      nickname: row.viewer_nickname,
      role: row.viewer_role,
      state: row.viewer_state,
      archiveEligible: row.viewer_archive_eligible,
      isFavorite: row.viewer_is_favorite,
    },
  };
}

function parsePageInput(input: {
  readonly limit?: number;
  readonly cursor?: RoomReadCursor;
}): {
  readonly limit: number;
  readonly cursor?: { readonly updatedAt: string; readonly roomId: string };
} {
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RoomReadError("invalid_input");
  }

  if (!input.cursor) return { limit };

  const cursor = cursorSchema.safeParse(input.cursor);
  if (!cursor.success) {
    throw new RoomReadError("invalid_input");
  }

  return { limit, cursor: cursor.data };
}

export class SupabaseRoomReadRepository implements RoomReadRepository {
  constructor(private readonly suppliedClient?: SupabaseClient<Database>) {}

  async listCurrentViewerRooms(
    input: {
      readonly limit?: number;
      readonly cursor?: RoomReadCursor;
    } = {},
  ): Promise<RoomReadPage> {
    const parsed = parsePageInput(input);
    const supabase = this.suppliedClient ?? await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("list_current_user_rooms", {
      requested_limit: parsed.limit,
      requested_cursor_updated_at: parsed.cursor?.updatedAt,
      requested_cursor_id: parsed.cursor?.roomId,
    });

    if (error) {
      throw mapRpcError(error);
    }

    if (!Array.isArray(data)) {
      throw new RoomReadError("read_unavailable");
    }

    const items = data.map(mapRow);
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        items.length === parsed.limit && last
          ? { updatedAt: last.updatedAt, roomId: last.id }
          : null,
    };
  }

  async findCurrentViewerRoom(
    publicId: RoomPublicId,
  ): Promise<RoomReadModel | null> {
    if (!parseRoomPublicId(publicId)) {
      throw new RoomReadError("invalid_input");
    }

    const supabase = this.suppliedClient ?? await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_current_user_room", {
      requested_public_id: publicId,
    });

    if (error) {
      throw mapRpcError(error);
    }

    if (!Array.isArray(data)) {
      throw new RoomReadError("read_unavailable");
    }

    if (data.length === 0) return null;
    if (data.length !== 1) {
      throw new RoomReadError("read_unavailable");
    }

    return mapRow(data[0]);
  }
}
