"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRoomInvite, RoomInviteError } from "@/data/supabase/room-invites";

const inputSchema = z.object({
  roomPublicId: z.string().regex(/^room_[a-z0-9_]{3,40}$/),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code: z.string().regex(/^[A-Z0-9]{8}$/),
});

export async function rotateRoomInviteAction(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  try {
    const invite = await createRoomInvite({
      publicId: parsed.data.roomPublicId,
      token: parsed.data.token,
      code: parsed.data.code,
    });
    revalidatePath(`/rooms/${parsed.data.roomPublicId}`);
    return { ok: true as const, revision: invite.invite_revision };
  } catch (error) {
    if (error instanceof RoomInviteError) return { ok: false as const };
    return { ok: false as const };
  }
}
