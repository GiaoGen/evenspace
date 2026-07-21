import type { AssetReference } from "@/core/domain/asset";
import type { MockSession } from "@/features/mock-session/model/mock-session";

export function collectAssetIds(session: MockSession): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const room of session.rooms) {
    for (const message of room.messages) {
      if (message.content?.type === "image" || message.content?.type === "voice") ids.add(message.content.asset.id);
    }
    for (const item of room.boardItems) {
      const asset: AssetReference | undefined = item.kind === "photo" ? item.asset : item.kind === "drawing" ? item.asset : undefined;
      if (asset) ids.add(asset.id);
    }
  }
  return ids;
}
