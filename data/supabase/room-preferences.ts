import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

const publicIdSchema = z.string().regex(/^room_[a-z0-9_]{3,40}$/);
const favoriteResultSchema = z.object({
  room_id: z.string().uuid(),
  is_favorite: z.boolean(),
});
const hiddenResultSchema = z.object({
  room_id: z.string().uuid(),
  hidden_at: z.string().nullable(),
});

export type RoomPreferenceErrorCode =
  | "invalid_input"
  | "forbidden"
  | "unavailable";

export class RoomPreferenceError extends Error {
  readonly code: RoomPreferenceErrorCode;

  constructor(code: RoomPreferenceErrorCode) {
    super(code === "invalid_input"
      ? "This room preference is invalid."
      : code === "forbidden"
        ? "This room preference cannot be changed."
        : "Room preferences are temporarily unavailable.");
    this.name = "RoomPreferenceError";
    this.code = code;
  }
}

function mapError(error: { readonly code?: string }): RoomPreferenceError {
  if (error.code === "22023") return new RoomPreferenceError("invalid_input");
  if (error.code === "42501") return new RoomPreferenceError("forbidden");
  return new RoomPreferenceError("unavailable");
}

function requirePublicId(value: unknown) {
  const parsed = publicIdSchema.safeParse(value);
  if (!parsed.success) throw new RoomPreferenceError("invalid_input");
  return parsed.data;
}

export async function setCurrentUserRoomFavorite(input: {
  readonly roomPublicId: unknown;
  readonly isFavorite: unknown;
}) {
  const roomPublicId = requirePublicId(input.roomPublicId);
  if (typeof input.isFavorite !== "boolean") {
    throw new RoomPreferenceError("invalid_input");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_current_user_room_favorite", {
    requested_public_id: roomPublicId,
    requested_is_favorite: input.isFavorite,
  });
  if (error) throw mapError(error);

  const parsed = favoriteResultSchema.safeParse(data?.[0]);
  if (!parsed.success) throw new RoomPreferenceError("unavailable");
  return { roomId: parsed.data.room_id, isFavorite: parsed.data.is_favorite };
}

export async function setCurrentUserRoomHidden(input: {
  readonly roomPublicId: unknown;
  readonly hidden: unknown;
}) {
  const roomPublicId = requirePublicId(input.roomPublicId);
  if (typeof input.hidden !== "boolean") {
    throw new RoomPreferenceError("invalid_input");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_current_user_room_hidden", {
    requested_public_id: roomPublicId,
    requested_hidden: input.hidden,
  });
  if (error) throw mapError(error);

  const parsed = hiddenResultSchema.safeParse(data?.[0]);
  if (!parsed.success) throw new RoomPreferenceError("unavailable");
  return { roomId: parsed.data.room_id, hiddenAt: parsed.data.hidden_at };
}
