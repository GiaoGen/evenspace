import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { zineStyleSchema } from "@/features/zine/model/template-manifest";

const zinePublicIdSchema = z.string().trim().regex(/^zine_[a-z0-9]{12,40}$/);
const roomPublicIdSchema = z.string().trim().min(1).max(80);
const jpegPlaceholderSchema = z.string()
  .min(32)
  .max(10_000)
  .startsWith("data:image/jpeg;base64,");

const createZineDraftInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("room"),
    roomPublicId: roomPublicIdSchema,
    title: z.string().trim().min(1).max(80),
    style: zineStyleSchema,
    idempotencyKey: z.uuid(),
  }).strict(),
  z.object({
    kind: z.literal("standalone"),
    roomPublicId: z.null().optional(),
    title: z.string().trim().min(1).max(80),
    style: zineStyleSchema,
    idempotencyKey: z.uuid(),
  }).strict(),
]);

const prepareZinePhotoUploadInputSchema = z.object({
  zinePublicId: zinePublicIdSchema,
  displayByteSize: z.number().int().min(1).max(2_250_000),
  thumbnailByteSize: z.number().int().min(1).max(184_320),
  placeholderDataUrl: jpegPlaceholderSchema,
  imageWidth: z.number().int().min(1).max(1_600),
  imageHeight: z.number().int().min(1).max(1_600),
  idempotencyKey: z.uuid(),
}).strict();

const finalizeZinePhotoUploadInputSchema = z.object({
  uploadId: z.uuid(),
}).strict();

const enqueueZineGenerationInputSchema = z.object({
  zinePublicId: zinePublicIdSchema,
  sourceId: z.uuid(),
  kind: z.enum(["compose", "recompose", "change-style"]),
  idempotencyKey: z.uuid(),
}).strict();

const draftPhotoChoiceSchema = z.object({
  sourceId: z.uuid(),
  textKind: z.enum(["none", "comment", "reflection"]),
  commentId: z.uuid().nullable(),
  reflection: z.string().trim().max(500).nullable(),
}).strict().superRefine((choice, context) => {
  if (choice.textKind === "comment" && !choice.commentId) context.addIssue({ code: "custom", path: ["commentId"], message: "A comment is required" });
  if (choice.textKind === "reflection" && !choice.reflection) context.addIssue({ code: "custom", path: ["reflection"], message: "A reflection is required" });
});

const saveZineManualDraftInputSchema = z.object({
  zinePublicId: zinePublicIdSchema,
  title: z.string().trim().min(1).max(80),
  style: zineStyleSchema,
  photos: z.array(draftPhotoChoiceSchema).min(1).max(48),
}).strict();

const publishZineDeterministicInputSchema = z.object({
  zinePublicId: zinePublicIdSchema,
  chapterBasis: z.enum(["itinerary", "captured-time"]),
  layoutDocument: z.record(z.string(), z.unknown()),
}).strict();

const createZineDraftResultSchema = z.object({
  zine_id: z.uuid(),
  public_id: zinePublicIdSchema,
  kind: z.enum(["room", "standalone"]),
  status: z.enum(["draft", "generating", "ready", "failed", "deleted"]),
  created: z.boolean(),
}).strict();

const prepareZinePhotoUploadResultSchema = z.object({
  upload_id: z.uuid(),
  asset_id: z.uuid(),
  object_key: z.string().startsWith("zines/").endsWith("/display.jpg"),
  thumbnail_object_key: z.string().startsWith("zines/").endsWith("/thumbnail.jpg"),
}).strict();

const finalizeZinePhotoUploadResultSchema = z.object({
  upload_id: z.uuid(),
  asset_id: z.uuid(),
  status: z.enum(["ready", "attached"]),
}).strict();

const enqueueZineGenerationResultSchema = z.object({
  job_id: z.uuid(),
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  attempt_count: z.number().int().min(1).max(5),
  retried: z.boolean(),
}).strict();

const saveZineManualDraftResultSchema = z.object({
  zine_id: z.uuid(), selected_count: z.number().int().min(1).max(48), updated_at: z.string().datetime({ offset: true }),
}).strict();
const publishZineDeterministicResultSchema = z.object({
  version_id: z.uuid(), version_number: z.number().int().positive(), status: z.literal("ready"),
}).strict();

export type CreateZineDraftInput = z.input<typeof createZineDraftInputSchema>;
export type CreateZineDraftResult = z.infer<typeof createZineDraftResultSchema>;
export type PrepareZinePhotoUploadInput = z.input<typeof prepareZinePhotoUploadInputSchema>;
export type PrepareZinePhotoUploadResult = z.infer<typeof prepareZinePhotoUploadResultSchema>;
export type FinalizeZinePhotoUploadInput = z.input<typeof finalizeZinePhotoUploadInputSchema>;
export type FinalizeZinePhotoUploadResult = z.infer<typeof finalizeZinePhotoUploadResultSchema>;
export type EnqueueZineGenerationInput = z.input<typeof enqueueZineGenerationInputSchema>;
export type EnqueueZineGenerationResult = z.infer<typeof enqueueZineGenerationResultSchema>;
export type SaveZineManualDraftInput = z.input<typeof saveZineManualDraftInputSchema>;
export type PublishZineDeterministicInput = z.input<typeof publishZineDeterministicInputSchema>;

export type ZineCommandErrorCode =
  | "invalid_input"
  | "authentication_required"
  | "permanent_account_required"
  | "identity_bootstrap_required"
  | "zine_access_denied"
  | "photo_limit_reached"
  | "upload_missing"
  | "command_unavailable";

const safeMessages: Record<ZineCommandErrorCode, string> = {
  invalid_input: "The zine command input is invalid.",
  authentication_required: "Sign in to continue.",
  permanent_account_required: "A permanent account is required.",
  identity_bootstrap_required: "Finish setting up your account first.",
  zine_access_denied: "You do not have access to manage this zine.",
  photo_limit_reached: "A zine can include at most 48 photos.",
  upload_missing: "The uploaded photo could not be verified.",
  command_unavailable: "The zine command is temporarily unavailable.",
};

export class ZineCommandError extends Error {
  readonly code: ZineCommandErrorCode;

  constructor(code: ZineCommandErrorCode) {
    super(safeMessages[code]);
    this.name = "ZineCommandError";
    this.code = code;
  }
}

type RpcError = {
  readonly code?: string;
  readonly message?: string;
};

type ZineRpcResponse = PromiseLike<{
  readonly data: unknown;
  readonly error: RpcError | null;
}>;

type ZineRpcClient = {
  rpc(name: "create_zine_draft", args: {
    requested_kind: "room" | "standalone";
    requested_room_public_id: string | null;
    requested_title: string;
    requested_style: "quiet-field" | "living-sequence";
    requested_idempotency_key: string;
  }): ZineRpcResponse;
  rpc(name: "prepare_zine_photo_upload", args: {
    requested_zine_public_id: string;
    requested_display_byte_size: number;
    requested_thumbnail_byte_size: number;
    requested_placeholder_data_url: string;
    requested_image_width: number;
    requested_image_height: number;
    requested_idempotency_key: string;
  }): ZineRpcResponse;
  rpc(name: "finalize_zine_photo_upload", args: {
    requested_upload_id: string;
  }): ZineRpcResponse;
  rpc(name: "enqueue_zine_generation", args: {
    requested_zine_public_id: string;
    requested_source_id: string;
    requested_kind: "compose" | "recompose" | "change-style";
    requested_idempotency_key: string;
  }): ZineRpcResponse;
  rpc(name: "save_zine_manual_draft", args: {
    requested_zine_public_id: string;
    requested_title: string;
    requested_style: "quiet-field" | "living-sequence";
    requested_photos: unknown;
  }): ZineRpcResponse;
  rpc(name: "publish_zine_deterministic", args: {
    requested_zine_public_id: string;
    requested_chapter_basis: "itinerary" | "captured-time";
    requested_layout_document: unknown;
  }): ZineRpcResponse;
};

async function createZineRpcClient(): Promise<ZineRpcClient> {
  // The generated project types cannot include a local-only migration until it
  // is deployed. Keep that transition isolated behind this exact RPC surface.
  return await createSupabaseServerClient() as unknown as ZineRpcClient;
}

function mapRpcError(error: RpcError): ZineCommandError {
  switch (error.message) {
    case "permanent_account_required":
      return new ZineCommandError("permanent_account_required");
    case "identity_bootstrap_required":
      return new ZineCommandError("identity_bootstrap_required");
    case "authentication_required":
      return new ZineCommandError("authentication_required");
    case "ended_room_host_required":
    case "standalone_zine_owner_required":
    case "zine_upload_owner_required":
    case "zine_manage_permission_required":
      return new ZineCommandError("zine_access_denied");
    case "zine_photo_limit_reached":
      return new ZineCommandError("photo_limit_reached");
    case "zine_upload_not_found":
      return new ZineCommandError("upload_missing");
  }

  if (error.code === "P0002") return new ZineCommandError("identity_bootstrap_required");
  if (error.code === "22023") return new ZineCommandError("invalid_input");
  if (error.code === "42501") return new ZineCommandError("zine_access_denied");
  return new ZineCommandError("command_unavailable");
}

function parseInput<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ZineCommandError("invalid_input");
  return result.data;
}

function parseRpcResult<TSchema extends z.ZodType>(schema: TSchema, data: unknown): z.output<TSchema> {
  const result = schema.safeParse(Array.isArray(data) ? data[0] : undefined);
  if (!result.success) throw new ZineCommandError("command_unavailable");
  return result.data;
}

export async function createZineDraft(input: CreateZineDraftInput): Promise<CreateZineDraftResult> {
  const parsed = parseInput(createZineDraftInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("create_zine_draft", {
    requested_kind: parsed.kind,
    requested_room_public_id: parsed.kind === "room" ? parsed.roomPublicId : null,
    requested_title: parsed.title,
    requested_style: parsed.style,
    requested_idempotency_key: parsed.idempotencyKey,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(createZineDraftResultSchema, data);
}

export async function prepareZinePhotoUpload(
  input: PrepareZinePhotoUploadInput,
): Promise<PrepareZinePhotoUploadResult> {
  const parsed = parseInput(prepareZinePhotoUploadInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("prepare_zine_photo_upload", {
    requested_zine_public_id: parsed.zinePublicId,
    requested_display_byte_size: parsed.displayByteSize,
    requested_thumbnail_byte_size: parsed.thumbnailByteSize,
    requested_placeholder_data_url: parsed.placeholderDataUrl,
    requested_image_width: parsed.imageWidth,
    requested_image_height: parsed.imageHeight,
    requested_idempotency_key: parsed.idempotencyKey,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(prepareZinePhotoUploadResultSchema, data);
}

export async function finalizeZinePhotoUpload(
  input: FinalizeZinePhotoUploadInput,
): Promise<FinalizeZinePhotoUploadResult> {
  const parsed = parseInput(finalizeZinePhotoUploadInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("finalize_zine_photo_upload", {
    requested_upload_id: parsed.uploadId,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(finalizeZinePhotoUploadResultSchema, data);
}

export async function enqueueZineGeneration(
  input: EnqueueZineGenerationInput,
): Promise<EnqueueZineGenerationResult> {
  const parsed = parseInput(enqueueZineGenerationInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("enqueue_zine_generation", {
    requested_zine_public_id: parsed.zinePublicId,
    requested_source_id: parsed.sourceId,
    requested_kind: parsed.kind,
    requested_idempotency_key: parsed.idempotencyKey,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(enqueueZineGenerationResultSchema, data);
}

export async function saveZineManualDraft(input: SaveZineManualDraftInput) {
  const parsed = parseInput(saveZineManualDraftInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("save_zine_manual_draft", {
    requested_zine_public_id: parsed.zinePublicId,
    requested_title: parsed.title,
    requested_style: parsed.style,
    requested_photos: parsed.photos,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(saveZineManualDraftResultSchema, data);
}

export async function publishZineDeterministic(input: PublishZineDeterministicInput) {
  const parsed = parseInput(publishZineDeterministicInputSchema, input);
  const supabase = await createZineRpcClient();
  const { data, error } = await supabase.rpc("publish_zine_deterministic", {
    requested_zine_public_id: parsed.zinePublicId,
    requested_chapter_basis: parsed.chapterBasis,
    requested_layout_document: parsed.layoutDocument,
  });
  if (error) throw mapRpcError(error);
  return parseRpcResult(publishZineDeterministicResultSchema, data);
}
