"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createUuid } from "@/core/domain/uuid";
import type { Database } from "@/data/supabase/database.types";
import { getServerSupabaseEnv } from "@/data/supabase/env-server";
import { getZineStudio } from "@/data/supabase/zine-studio-repository";
import {
  createZineDraft,
  finalizeZinePhotoUpload,
  prepareZinePhotoUpload,
  publishZineDeterministic,
  saveZineManualDraft,
} from "@/data/supabase/zine-commands";
import { buildDeterministicZineLayout, type DeterministicChapterInput } from "@/features/zine/model/deterministic-layout";
import { countEnglishWords } from "@/features/zine/model/layout-document";
import { zineStyleSchema } from "@/features/zine/model/template-manifest";

type ActionResult<T = undefined> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly message: string };
const publicIdSchema = z.string().regex(/^zine_[a-z0-9]{12,40}$/);
const choiceSchema = z.object({
  sourceId: z.uuid(), textKind: z.enum(["none", "comment", "reflection"]), commentId: z.uuid().nullable(), reflection: z.string().nullable(),
}).strict();

function failure(error: unknown): ActionResult<never> {
  console.error("Book action failed", error);
  return { ok: false, message: "This book could not be saved. Please try again." };
}

export async function createBookDraftAction(input: unknown): Promise<ActionResult<{ readonly publicId: string }>> {
  const parsed = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("standalone"), title: z.string().trim().min(1).max(80), style: zineStyleSchema }).strict(),
    z.object({ kind: z.literal("room"), roomPublicId: z.string().min(1).max(80), title: z.string().trim().min(1).max(80), style: zineStyleSchema }).strict(),
  ]).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a title and style to continue." };
  try {
    const result = await createZineDraft({ ...parsed.data, idempotencyKey: createUuid() });
    return { ok: true, data: { publicId: result.public_id } };
  } catch (error) { return failure(error); }
}

export async function saveBookDraftAction(input: unknown): Promise<ActionResult<{ readonly selectedCount: number }>> {
  const parsed = z.object({
    zinePublicId: publicIdSchema,
    title: z.string().trim().min(1).max(80),
    style: zineStyleSchema,
    photos: z.array(choiceSchema).min(1).max(48),
  }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "Select between 1 and 48 photos before saving." };
  if (parsed.data.photos.some((photo) => photo.textKind === "reflection" && (!photo.reflection || countEnglishWords(photo.reflection) > 40))) {
    return { ok: false, message: "Reflections need 1–40 English words." };
  }
  try {
    const result = await saveZineManualDraft(parsed.data);
    revalidatePath(`/books/${parsed.data.zinePublicId}`);
    return { ok: true, data: { selectedCount: result.selected_count } };
  } catch (error) { return failure(error); }
}

function itineraryChapters(studio: NonNullable<Awaited<ReturnType<typeof getZineStudio>>>) {
  const unmatched = new Set(studio.photos.filter((photo) => photo.selected).map((photo) => photo.sourceId));
  const chapters: DeterministicChapterInput[] = studio.itinerary.flatMap((item) => {
    const ids = studio.photos.filter((photo) => {
      if (!photo.selected || !photo.capturedAt) return false;
      const time = Date.parse(photo.capturedAt);
      return time >= Date.parse(item.startsAt) && (!item.endsAt || time <= Date.parse(item.endsAt));
    }).map((photo) => photo.sourceId);
    ids.forEach((id) => unmatched.delete(id));
    return ids.length ? [{ id: `chapter_${item.id.replaceAll("-", "_")}`, title: item.title.slice(0, 48), timeLabel: null, photoIds: ids }] : [];
  });
  if (unmatched.size) chapters.push({ id: "chapter_between_moments", title: "Between moments", timeLabel: null, photoIds: [...unmatched] });
  return chapters;
}

export async function composeBookAction(input: unknown): Promise<ActionResult<{ readonly version: number }>> {
  const parsed = z.object({ zinePublicId: publicIdSchema, chapterBasis: z.enum(["itinerary", "captured-time"]) }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "This compose request is invalid." };
  try {
    const studio = await getZineStudio(parsed.data.zinePublicId);
    if (!studio || studio.status !== "draft") return { ok: false, message: "This draft is no longer editable." };
    const selected = studio.photos.filter((photo) => photo.selected);
    if (!selected.length || selected.length > 48) return { ok: false, message: "Select between 1 and 48 photos." };
    const layout = buildDeterministicZineLayout({
      id: studio.publicId,
      title: studio.title,
      style: studio.style,
      createdAt: new Date().toISOString(),
      photos: selected.map((photo) => {
        const comment = photo.textKind === "comment" ? photo.comments.find((item) => item.id === photo.commentId) : null;
        return {
          id: photo.sourceId,
          src: `/api/books/${studio.publicId}/photos/${photo.assetId}`,
          width: photo.width,
          height: photo.height,
          alt: photo.originalName,
          capturedAt: photo.capturedAt,
          ...(photo.placeholderDataUrl ? { placeholderDataUrl: photo.placeholderDataUrl } : {}),
          ...(comment ? { text: { kind: "comment" as const, body: comment.body, authorName: comment.authorName } }
            : photo.textKind === "reflection" && photo.reflection ? { text: { kind: "reflection" as const, body: photo.reflection } }
            : {}),
        };
      }),
      ...(parsed.data.chapterBasis === "itinerary" && studio.itinerary.length ? { chapters: itineraryChapters(studio) } : {}),
    });
    const result = await publishZineDeterministic({ ...parsed.data, layoutDocument: layout });
    revalidatePath(`/books/${studio.publicId}`);
    return { ok: true, data: { version: result.version_number } };
  } catch (error) { return failure(error); }
}

function signingClient() {
  const { url, secretKey } = getServerSupabaseEnv();
  return createClient<Database>(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function prepareBookPhotoUploadAction(input: unknown): Promise<ActionResult<{
  readonly uploadId: string; readonly objectKey: string; readonly token: string; readonly thumbnailObjectKey: string; readonly thumbnailToken: string;
}>> {
  const parsed = z.object({
    zinePublicId: publicIdSchema, displayByteSize: z.number().int().positive().max(2_250_000),
    thumbnailByteSize: z.number().int().positive().max(184_320), placeholderDataUrl: z.string().startsWith("data:image/jpeg;base64,").max(10_000),
    imageWidth: z.number().int().positive().max(1600), imageHeight: z.number().int().positive().max(1600),
  }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "This photo is not supported." };
  try {
    const prepared = await prepareZinePhotoUpload({ ...parsed.data, idempotencyKey: createUuid() });
    const storage = signingClient().storage.from("zine-media");
    const [display, thumbnail] = await Promise.all([
      storage.createSignedUploadUrl(prepared.object_key), storage.createSignedUploadUrl(prepared.thumbnail_object_key),
    ]);
    if (display.error || thumbnail.error || !display.data?.token || !thumbnail.data?.token) throw new Error("upload_url_failed");
    return { ok: true, data: { uploadId: prepared.upload_id, objectKey: prepared.object_key, token: display.data.token, thumbnailObjectKey: prepared.thumbnail_object_key, thumbnailToken: thumbnail.data.token } };
  } catch (error) { return failure(error); }
}

export async function finalizeBookPhotoUploadAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ zinePublicId: publicIdSchema, uploadId: z.uuid() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "This upload is invalid." };
  try {
    await finalizeZinePhotoUpload({ uploadId: parsed.data.uploadId });
    revalidatePath(`/books/${parsed.data.zinePublicId}`);
    return { ok: true, data: undefined };
  } catch (error) { return failure(error); }
}
