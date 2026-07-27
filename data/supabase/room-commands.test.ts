import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BackendCommandError,
  bootstrapCurrentIdentity,
  createHostLedRoom,
} from "@/data/supabase/room-commands";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe("Supabase identity and room commands", () => {
  it("normalizes identity input and uses the typed bootstrap RPC", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          profile_user_id: "11000000-0000-4000-8000-000000000001",
          actor_id: "21000000-0000-4000-8000-000000000001",
          actor_kind: "account",
          display_name: "Event Host",
          theme: "system",
          is_anonymous: false,
        },
      ],
      error: null,
    });

    const result = await bootstrapCurrentIdentity({
      displayName: "  Event Host  ",
    });

    expect(rpc).toHaveBeenCalledWith("bootstrap_identity", {
      requested_display_name: "Event Host",
      requested_theme: "system",
    });
    expect(result.actor_kind).toBe("account");
  });

  it("rejects invalid identity input before creating a request client", async () => {
    await expect(
      bootstrapCurrentIdentity({ displayName: " ".repeat(2) }),
    ).rejects.toMatchObject({ code: "invalid_input" });

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("sends only user-editable room fields and an idempotency UUID", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          room_id: "31000000-0000-4000-8000-000000000001",
          public_id: "launch-room",
          actor_id: "21000000-0000-4000-8000-000000000001",
          created: true,
        },
      ],
      error: null,
    });

    const result = await createHostLedRoom({
      name: "  Launch room ",
      description: "  Team launch  ",
      timeZone: " America/New_York ",
      durationMinutes: 180,
      memberLimit: 6,
      requiresApproval: true,
      idempotencyKey: "41000000-0000-4000-8000-000000000001",
    });

    expect(rpc).toHaveBeenCalledWith("create_host_led_room", {
      requested_name: "Launch room",
      requested_description: "Team launch",
      requested_time_zone: "America/New_York",
      requested_duration_minutes: 180,
      requested_member_limit: 6,
      requested_requires_approval: true,
      requested_idempotency_key: "41000000-0000-4000-8000-000000000001",
    });
    expect(result).toMatchObject({ public_id: "launch-room", created: true });
  });

  it("rejects invalid room input without contacting Supabase", async () => {
    await expect(
      createHostLedRoom({
        name: "Room",
        description: "",
        timeZone: "UTC",
        durationMinutes: 1,
        memberLimit: 6,
        requiresApproval: true,
        idempotencyKey: "not-a-uuid",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    ["permanent_account_required", "42501", "permanent_account_required"],
    ["identity_bootstrap_required", "P0002", "identity_bootstrap_required"],
    ["provider-secret-detail", "XX000", "command_unavailable"],
  ] as const)(
    "maps database failure %s to a stable public error",
    async (message, code, expectedCode) => {
      rpc.mockResolvedValue({ data: null, error: { message, code } });

      const request = createHostLedRoom({
        name: "Room",
        description: "",
        timeZone: "UTC",
        durationMinutes: 60,
        memberLimit: 4,
        requiresApproval: false,
        idempotencyKey: "41000000-0000-4000-8000-000000000001",
      });

      await expect(request).rejects.toMatchObject({
        code: expectedCode,
      });
      await expect(request).rejects.not.toThrow("provider-secret-detail");
    },
  );

  it("fails closed when the RPC result is missing or malformed", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(
      bootstrapCurrentIdentity({ displayName: "Host" }),
    ).rejects.toEqual(new BackendCommandError("command_unavailable"));
  });
});
