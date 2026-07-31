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
  readonly thumbnailFile?: Blob;
  readonly placeholderDataUrl?: string;
  readonly width?: number;
  readonly height?: number;
}) {
  const prepared = await prepareRoomMediaUploadAction(input.kind === "image"
    ? {
      roomPublicId: input.roomPublicId,
      kind: "image",
      mimeType: input.mimeType,
      byteSize: input.file.size,
      thumbnailByteSize: input.thumbnailFile?.size,
      placeholderDataUrl: input.placeholderDataUrl,
      width: input.width,
      height: input.height,
    }
    : {
      roomPublicId: input.roomPublicId,
      kind: "voice",
      mimeType: input.mimeType,
      byteSize: input.file.size,
      durationMs: input.durationMs,
    });
  if (!prepared.ok) throw new Error(prepared.message);
  const supabase = createSupabaseBrowserClient();
  const uploads = [supabase.storage.from("room-media")
    .uploadToSignedUrl(prepared.data.objectKey, prepared.data.token, input.file, { contentType: input.mimeType })];
  if (input.kind === "image") {
    if (!input.thumbnailFile || !prepared.data.thumbnailObjectKey || !prepared.data.thumbnailToken) {
      throw new Error("The image thumbnail could not be prepared.");
    }
    uploads.push(supabase.storage.from("room-media")
      .uploadToSignedUrl(prepared.data.thumbnailObjectKey, prepared.data.thumbnailToken, input.thumbnailFile, { contentType: "image/jpeg" }));
  }
  const outcomes = await Promise.all(uploads);
  if (outcomes.some((outcome) => outcome.error)) throw new Error("The upload could not be completed.");
  const finalized = await finalizeRoomMediaUploadAction({ assetId: prepared.data.assetId, kind: input.kind });
  if (!finalized.ok) throw new Error(finalized.message);
  return finalized.data;
}
