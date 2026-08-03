import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "./server-client";
import { safeParseZineLayoutDocument, type ZineLayoutDocument } from "@/features/zine/model/layout-document";
import { zineStyleSchema, type ZineStyle } from "@/features/zine/model/template-manifest";

const studioPhotoSchema = z.object({
  sourceId: z.uuid(),
  assetId: z.uuid(),
  originalName: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  capturedAt: z.string().datetime({ offset: true }),
  objectKey: z.string().min(1),
  thumbnailObjectKey: z.string().nullable(),
  placeholderDataUrl: z.string().nullable(),
  selected: z.boolean(),
  textKind: z.enum(["none", "comment", "reflection"]),
  commentId: z.uuid().nullable(),
  reflection: z.string().nullable(),
  comments: z.array(z.object({ id: z.uuid(), body: z.string().min(1), authorName: z.string().min(1) }).strict()),
}).strict();

const studioSchema = z.object({
  publicId: z.string().regex(/^zine_[a-z0-9]{12,40}$/),
  kind: z.enum(["room", "standalone"]),
  status: z.enum(["draft", "generating", "ready", "failed", "deleted"]),
  title: z.string().min(1).max(80),
  style: zineStyleSchema,
  roomPublicId: z.string().nullable(),
  roomName: z.string().nullable(),
  photos: z.array(studioPhotoSchema).max(500),
  itinerary: z.array(z.object({
    id: z.uuid(), title: z.string().min(1), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }).nullable(),
  }).strict()),
  currentLayout: z.unknown().nullable(),
}).strict();

export interface ZineStudioPhoto extends z.infer<typeof studioPhotoSchema> {
  readonly src: string;
  readonly thumbnailSrc: string;
}

export interface ZineStudioData {
  readonly publicId: string;
  readonly kind: "room" | "standalone";
  readonly status: "draft" | "generating" | "ready" | "failed" | "deleted";
  readonly title: string;
  readonly style: ZineStyle;
  readonly roomPublicId: string | null;
  readonly roomName: string | null;
  readonly photos: readonly ZineStudioPhoto[];
  readonly itinerary: readonly { readonly id: string; readonly title: string; readonly startsAt: string; readonly endsAt: string | null }[];
  readonly currentLayout: ZineLayoutDocument | null;
}

type RpcClient = {
  rpc(name: "get_zine_studio", args: { requested_zine_public_id: string }): PromiseLike<{
    readonly data: unknown;
    readonly error: { readonly message?: string } | null;
  }>;
};

export async function getZineStudio(publicId: string): Promise<ZineStudioData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase as unknown as RpcClient).rpc("get_zine_studio", {
    requested_zine_public_id: publicId,
  });
  if (error?.message === "zine_manage_permission_required") return null;
  if (error) throw new Error("Book Studio is unavailable right now.");
  const parsed = studioSchema.safeParse(data);
  if (!parsed.success) throw new Error("Book Studio returned an invalid document.");
  const bucket = parsed.data.kind === "room" ? "room-media" : "zine-media";
  const paths = [...new Set(parsed.data.photos.flatMap((photo) => [photo.objectKey, photo.thumbnailObjectKey].filter((value): value is string => Boolean(value))))];
  const signed = paths.length ? await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 30) : { data: [], error: null };
  if (signed.error) throw new Error("Private book photos could not be opened.");
  const urls = new Map((signed.data ?? []).flatMap((item) => item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
  const photos = parsed.data.photos.flatMap((photo) => {
    const src = urls.get(photo.objectKey);
    if (!src) return [];
    return [{ ...photo, src, thumbnailSrc: photo.thumbnailObjectKey ? urls.get(photo.thumbnailObjectKey) ?? src : src }];
  });
  const current = parsed.data.currentLayout === null ? null : safeParseZineLayoutDocument(parsed.data.currentLayout);
  return { ...parsed.data, photos, currentLayout: current?.success ? current.data : null };
}

export async function getPublishedZineLayout(publicId: string): Promise<ZineLayoutDocument | null> {
  const supabase = await createSupabaseServerClient();
  const zine = await supabase.from("zines").select("id,status").eq("public_id", publicId).eq("status", "ready").maybeSingle();
  if (zine.error || !zine.data) return null;
  const version = await supabase.from("zine_versions").select("layout_document").eq("zine_id", zine.data.id).eq("is_current", true).eq("status", "ready").maybeSingle();
  if (version.error || !version.data?.layout_document) return null;
  const parsed = safeParseZineLayoutDocument(version.data.layout_document);
  return parsed.success ? parsed.data : null;
}
