import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/data/supabase/server-client";
import {
  createZineDraft,
  enqueueZineGeneration,
  finalizeZinePhotoUpload,
  prepareZinePhotoUpload,
  ZineCommandError,
} from "@/data/supabase/zine-commands";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe("Supabase zine commands", () => {
  it("normalizes a standalone draft and never invents a Room association", async () => {
    rpc.mockResolvedValue({
      data: [{
        zine_id: "11000000-0000-4000-8000-000000000001",
        public_id: "zine_12345678901234567890",
        kind: "standalone",
        status: "draft",
        created: true,
      }],
      error: null,
    });

    await expect(createZineDraft({
      kind: "standalone",
      title: "  A small journey  ",
      style: "quiet-field",
      idempotencyKey: "21000000-0000-4000-8000-000000000001",
    })).resolves.toMatchObject({ created: true, kind: "standalone" });

    expect(rpc).toHaveBeenCalledWith("create_zine_draft", {
      requested_kind: "standalone",
      requested_room_public_id: null,
      requested_title: "A small journey",
      requested_style: "quiet-field",
      requested_idempotency_key: "21000000-0000-4000-8000-000000000001",
    });
  });

  it("passes a Room id only for the Room Host flow", async () => {
    rpc.mockResolvedValue({
      data: [{
        zine_id: "11000000-0000-4000-8000-000000000002",
        public_id: "zine_abcdefghijklmnopqrst",
        kind: "room",
        status: "draft",
        created: false,
      }],
      error: null,
    });

    await createZineDraft({
      kind: "room",
      roomPublicId: "  ended-room  ",
      title: "Room book",
      style: "living-sequence",
      idempotencyKey: "21000000-0000-4000-8000-000000000002",
    });

    expect(rpc).toHaveBeenCalledWith("create_zine_draft", expect.objectContaining({
      requested_room_public_id: "ended-room",
    }));
  });

  it("validates upload metadata before issuing signed-upload paths", async () => {
    await expect(prepareZinePhotoUpload({
      zinePublicId: "zine_12345678901234567890",
      displayByteSize: 2_250_001,
      thumbnailByteSize: 10_000,
      placeholderDataUrl: `data:image/jpeg;base64,${"a".repeat(40)}`,
      imageWidth: 1_600,
      imageHeight: 1_200,
      idempotencyKey: "21000000-0000-4000-8000-000000000003",
    })).rejects.toMatchObject({ code: "invalid_input" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("prepares and finalizes a verified two-object JPEG upload", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{
          upload_id: "31000000-0000-4000-8000-000000000001",
          asset_id: "41000000-0000-4000-8000-000000000001",
          object_key: "zines/book/source/photo/display.jpg",
          thumbnail_object_key: "zines/book/source/photo/thumbnail.jpg",
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          upload_id: "31000000-0000-4000-8000-000000000001",
          asset_id: "41000000-0000-4000-8000-000000000001",
          status: "ready",
        }],
        error: null,
      });

    const prepared = await prepareZinePhotoUpload({
      zinePublicId: "zine_12345678901234567890",
      displayByteSize: 1_000_000,
      thumbnailByteSize: 100_000,
      placeholderDataUrl: `data:image/jpeg;base64,${"a".repeat(40)}`,
      imageWidth: 1_600,
      imageHeight: 1_067,
      idempotencyKey: "21000000-0000-4000-8000-000000000003",
    });
    await expect(finalizeZinePhotoUpload({ uploadId: prepared.upload_id }))
      .resolves.toMatchObject({ status: "ready" });
  });

  it("enqueues a bounded generation kind and preserves retry metadata", async () => {
    rpc.mockResolvedValue({
      data: [{
        job_id: "51000000-0000-4000-8000-000000000001",
        status: "queued",
        attempt_count: 2,
        retried: true,
      }],
      error: null,
    });

    await expect(enqueueZineGeneration({
      zinePublicId: "zine_12345678901234567890",
      sourceId: "61000000-0000-4000-8000-000000000001",
      kind: "recompose",
      idempotencyKey: "21000000-0000-4000-8000-000000000004",
    })).resolves.toMatchObject({ attempt_count: 2, retried: true });
  });

  it.each([
    ["zine_photo_limit_reached", "22023", "photo_limit_reached"],
    ["zine_upload_not_found", "22023", "upload_missing"],
    ["ended_room_host_required", "42501", "zine_access_denied"],
    ["provider-secret-detail", "XX000", "command_unavailable"],
  ] as const)("maps %s to a stable public error", async (message, code, expectedCode) => {
    rpc.mockResolvedValue({ data: null, error: { message, code } });
    const request = createZineDraft({
      kind: "standalone",
      title: "Book",
      style: "quiet-field",
      idempotencyKey: "21000000-0000-4000-8000-000000000005",
    });
    await expect(request).rejects.toMatchObject({ code: expectedCode });
    await expect(request).rejects.not.toThrow("provider-secret-detail");
  });

  it("fails closed on malformed RPC output", async () => {
    rpc.mockResolvedValue({ data: [{ status: "ready" }], error: null });
    await expect(createZineDraft({
      kind: "standalone",
      title: "Book",
      style: "quiet-field",
      idempotencyKey: "21000000-0000-4000-8000-000000000006",
    })).rejects.toEqual(new ZineCommandError("command_unavailable"));
  });
});
