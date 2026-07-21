import { describe, expect, it, vi } from "vitest";
import type { AssetKind, AssetReference } from "@/core/domain/asset";
import { migratePersistedLocalAssets } from "./migrate-local-assets";

describe("legacy local asset migration", () => {
  it("moves chat and board media out of serialized session data", async () => {
    let sequence = 0;
    const write = vi.fn(async (blob: Blob, kind: AssetKind): Promise<AssetReference> => ({
      id: `asset_${++sequence}`,
      kind,
      mimeType: blob.type,
      byteSize: blob.size,
    }));
    const serialized = JSON.stringify({
      version: 6,
      rooms: [{
        messages: [
          { content: { type: "image", dataUrl: "data:image/png;base64,AQID", name: "photo.png", aspectRatio: 1 } },
          { content: { type: "voice", dataUrl: "data:audio/webm;base64,BAUG", mimeType: "audio/webm", durationSeconds: 3 } },
        ],
        boardItems: [
          { kind: "photo", imageDataUrl: "data:image/jpeg;base64,BwgJ", imageName: "board.jpg" },
          { kind: "drawing", imageDataUrl: "data:image/png;base64,CgsM" },
        ],
      }],
    });

    const result = await migratePersistedLocalAssets(serialized, write);
    const migrated = JSON.parse(result) as Record<string, unknown>;

    expect(result).not.toContain("data:image");
    expect(result).not.toContain("data:audio");
    expect(result).not.toContain("imageDataUrl");
    expect(write).toHaveBeenCalledTimes(4);
    expect(write.mock.calls.map((call) => call[1])).toEqual(["image", "audio", "image", "image"]);
    expect(migrated).toMatchObject({ rooms: [{ messages: [{ content: { asset: { kind: "image" } } }, { content: { asset: { kind: "audio" } } }], boardItems: [{ asset: { kind: "image" } }, { asset: { kind: "image" } }] }] });
    const room = (migrated.rooms as Array<{ messages: Array<{ content: { asset: AssetReference } }>; boardItems: Array<{ asset: AssetReference }> }>)[0];
    const ids = [...room.messages.map((message) => message.content.asset.id), ...room.boardItems.map((item) => item.asset.id)];
    expect(new Set(ids)).toEqual(new Set(["asset_1", "asset_2", "asset_3", "asset_4"]));
  });
});
