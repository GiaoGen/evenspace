"use client";

import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import { finalizeRoomMediaUploadAction, prepareRoomMediaUploadAction } from "@/app/rooms/[roomId]/media-actions";
import type { AssetReference } from "@/core/domain/asset";
import type { RoomPublicId } from "@/core/domain/ids";
import { cacheLocalAsset } from "@/features/local-assets/model/local-asset-repository";

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
  readonly cacheScope?: string;
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
  if (input.kind === "image" && input.thumbnailFile && input.cacheScope) {
    const reference: AssetReference = {
      id: finalized.data.id,
      kind: "image",
      mimeType: finalized.data.mimeType,
      byteSize: finalized.data.byteSize,
      remoteUrl: finalized.data.signedUrl,
      thumbnail: {
        id: finalized.data.id,
        mimeType: "image/jpeg",
        byteSize: finalized.data.thumbnailByteSize ?? input.thumbnailFile.size,
        remoteUrl: finalized.data.thumbnailSignedUrl,
      },
      ...(input.placeholderDataUrl ? { placeholderDataUrl: input.placeholderDataUrl } : {}),
      ...(input.width && input.height ? { width: input.width, height: input.height } : {}),
      revision: 1,
    };
    await Promise.all([
      cacheLocalAsset(reference, input.file, { scope: input.cacheScope, variant: "display" }),
      cacheLocalAsset(reference, input.thumbnailFile, { scope: input.cacheScope, variant: "thumbnail" }),
    ]).catch(() => undefined);
  }
  return finalized.data;
}
