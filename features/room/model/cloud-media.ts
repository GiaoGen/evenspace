"use client";

import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import { finalizeRoomMediaUploadAction, prepareRoomMediaUploadAction } from "@/app/rooms/[roomId]/media-actions";
import type { RoomPublicId } from "@/core/domain/ids";

export async function uploadRoomMedia(input: {
  readonly roomPublicId: RoomPublicId;
  readonly kind: "image" | "voice";
  readonly file: Blob;
  readonly mimeType: string;
  readonly durationMs?: number;
}) {
  const prepared = await prepareRoomMediaUploadAction({
    roomPublicId: input.roomPublicId,
    kind: input.kind,
    mimeType: input.mimeType,
    byteSize: input.file.size,
    durationMs: input.durationMs,
  });
  if (!prepared.ok) throw new Error(prepared.message);
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from("room-media")
    .uploadToSignedUrl(prepared.data.objectKey, prepared.data.token, input.file, { contentType: input.mimeType });
  if (error) throw new Error("The upload could not be completed.");
  const finalized = await finalizeRoomMediaUploadAction({ assetId: prepared.data.assetId });
  if (!finalized.ok) throw new Error(finalized.message);
  return finalized.data;
}
