import { beforeEach, describe, expect, it, vi } from "vitest";

import { roomCommandAction } from "@/app/rooms/[roomId]/actions";
import {
  changeRoomMemberState,
  sendRoomMessage,
} from "@/data/supabase/backend-capabilities";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/supabase/backend-capabilities", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/supabase/backend-capabilities")>();
  return {
    ...original,
    changeRoomMemberState: vi.fn(),
    createItinerary: vi.fn(),
    endHostLedRoom: vi.fn(),
    endItinerary: vi.fn(),
    pinRoomMessage: vi.fn(),
    reactToRoomMessage: vi.fn(),
    recallRoomMessage: vi.fn(),
    reviewJoinRequest: vi.fn(),
    sendRoomMessage: vi.fn(),
    updateItinerary: vi.fn(),
  };
});
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const base = {
  roomPublicId: "room_wiring_main",
  actorId: "21000000-0000-4000-8000-000000000001",
  nowIso: "2026-07-27T12:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("roomCommandAction", () => {
  it("wires existing text message commands to the idempotent chat RPC", async () => {
    const result = await roomCommandAction({
      type: "POST_MESSAGE",
      ...base,
      message: {
        id: "message_41000000-0000-4000-8000-000000000001",
        body: "Hello from the existing composer",
      },
    });

    expect(result).toEqual({ status: "ok" });
    expect(sendRoomMessage).toHaveBeenCalledWith({
      roomPublicId: base.roomPublicId,
      kind: "text",
      body: "Hello from the existing composer",
      replyToMessageId: undefined,
      idempotencyKey: "41000000-0000-4000-8000-000000000001",
    });
  });

  it("wires Host member governance without trusting the submitted actor identity", async () => {
    const result = await roomCommandAction({
      type: "SET_MEMBER_STATE",
      ...base,
      targetActorId: "22000000-0000-4000-8000-000000000001",
      state: "muted",
    });

    expect(result).toEqual({ status: "ok" });
    expect(changeRoomMemberState).toHaveBeenCalledWith({
      roomPublicId: base.roomPublicId,
      actorId: "22000000-0000-4000-8000-000000000001",
      state: "muted",
    });
  });

  it("fails closed for malformed supported commands and ignores deferred features", async () => {
    await expect(roomCommandAction({ type: "END_ROOM" }))
      .resolves.toEqual({ status: "error", code: "invalid_input" });
    await expect(roomCommandAction({ type: "ADD_BOARD_ITEM", ...base }))
      .resolves.toEqual({ status: "ignored" });
  });
});
