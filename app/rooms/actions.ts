"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  RoomPreferenceError,
  setCurrentUserRoomFavorite,
  setCurrentUserRoomHidden,
} from "@/data/supabase/room-preferences";

const roomPublicIdSchema = z.string().regex(/^room_[a-z0-9_]{3,40}$/);

export type RoomPreferenceActionResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly code: "invalid_input" | "forbidden" | "unavailable" };

function actionError(error: unknown): RoomPreferenceActionResult {
  if (error instanceof RoomPreferenceError) {
    return { status: "error", code: error.code };
  }
  return { status: "error", code: "unavailable" };
}

export async function setRoomFavoriteAction(input: unknown): Promise<RoomPreferenceActionResult> {
  const parsed = z.object({
    roomPublicId: roomPublicIdSchema,
    isFavorite: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid_input" };

  try {
    await setCurrentUserRoomFavorite(parsed.data);
    revalidatePath("/rooms");
    return { status: "ok" };
  } catch (error) {
    return actionError(error);
  }
}

export async function hideRoomAction(input: unknown): Promise<RoomPreferenceActionResult> {
  const parsed = z.object({ roomPublicId: roomPublicIdSchema }).safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid_input" };

  try {
    await setCurrentUserRoomHidden({ ...parsed.data, hidden: true });
    revalidatePath("/rooms");
    return { status: "ok" };
  } catch (error) {
    return actionError(error);
  }
}
