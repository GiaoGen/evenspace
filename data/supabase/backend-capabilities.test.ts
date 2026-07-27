import { describe, expect, it, vi } from "vitest";

import {
  BackendCapabilityError,
  roomRealtimeTopic,
  sendRoomMessage,
} from "@/data/supabase/backend-capabilities";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("backend capability boundary", () => {
  it("builds only canonical private room topics", () => {
    expect(roomRealtimeTopic("37000000-0000-4000-8000-000000000001"))
      .toBe("room:37000000-0000-4000-8000-000000000001:events");
    expect(() => roomRealtimeTopic("room_public")).toThrow(BackendCapabilityError);
  });

  it("rejects malformed message commands before Supabase", async () => {
    await expect(sendRoomMessage({
      roomPublicId: "room_be018_main",
      kind: "text",
      body: "Hello",
      idempotencyKey: "not-a-uuid",
    })).rejects.toEqual(expect.objectContaining({ code: "invalid_input" }));
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
