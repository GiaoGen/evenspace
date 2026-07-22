import { describe, expect, it } from "vitest";

import { actorId } from "@/core/domain/ids";
import type { ChatMessage } from "@/core/domain/room";
import {
  createTestItinerary,
  createTestSession,
  TEST_NOW_ISO,
  testMember,
} from "@/test/factories/mock-session";

import {
  MOCK_SESSION_VERSION,
  mockSessionReducer,
  parsePersistedMockSession,
  type MockSession,
} from "./mock-session";

function asPersistedVersion(session: MockSession, version: 3 | 4) {
  const persisted = structuredClone(session) as unknown as {
    version: number;
    rooms: Array<{
      itinerary: Array<Record<string, unknown>>;
      activePoll: Record<string, unknown> | null;
    }>;
  };
  persisted.version = version;
  for (const item of persisted.rooms[0].itinerary) {
    delete item.endMode;
    delete item.endedAt;
    delete item.createdByActorId;
    delete item.createdAt;
    delete item.updatedAt;
  }
  return persisted;
}

describe("persisted mock-session migration", () => {
  it.each([3, 4] as const)("migrates v%s itinerary data to the current schema", (version) => {
    const session = createTestSession([createTestItinerary()]);
    const restored = parsePersistedMockSession(JSON.stringify(asPersistedVersion(session, version)));

    expect(restored?.version).toBe(MOCK_SESSION_VERSION);
    expect(restored?.rooms[0].itinerary[0]).toMatchObject({
      endMode: "scheduled",
      endedAt: null,
      createdByActorId: session.rooms[0].itinerary[0].responsible.actorId,
      createdAt: session.rooms[0].itinerary[0].startsAt,
      updatedAt: session.rooms[0].itinerary[0].startsAt,
    });
  });

  it("migrates itinerary proposals nested in active polls", () => {
    const item = createTestItinerary();
    const session = createTestSession();
    const room = session.rooms[0];
    const withPoll: MockSession = {
      ...session,
      rooms: [{
        ...room,
        activePoll: {
          id: "poll_itinerary",
          question: "Add lunch?",
          closesAt: "2030-01-01T10:30:00.000Z",
          memberSnapshot: 2,
          requiredVotes: 2,
          visibility: "public",
          choices: [{ id: "yes", label: "Yes", votes: 0 }, { id: "no", label: "No", votes: 0 }],
          voterActorIds: [],
          resolvedChoiceId: null,
          proposal: { kind: "itinerary", item },
        },
      }],
    };
    const persisted = asPersistedVersion(withPoll, 4);
    const proposal = persisted.rooms[0].activePoll?.proposal as Record<string, unknown>;
    const proposalItem = proposal.item as Record<string, unknown>;
    delete proposalItem.endMode;
    delete proposalItem.endedAt;
    delete proposalItem.createdByActorId;
    delete proposalItem.createdAt;
    delete proposalItem.updatedAt;

    const restored = parsePersistedMockSession(JSON.stringify(persisted));
    const restoredProposal = restored?.rooms[0].activePoll?.proposal;

    expect(restoredProposal?.kind).toBe("itinerary");
    if (restoredProposal?.kind === "itinerary") {
      expect(restoredProposal.item.endMode).toBe("scheduled");
      expect(restoredProposal.item.createdByActorId).toBe(item.responsible.actorId);
    }
  });

  it("moves v5 inline photo comments into the room comment collection", () => {
    const session = createTestSession();
    const persisted = structuredClone(session) as unknown as {
      version: number;
      rooms: Array<{
        boardItems: Array<Record<string, unknown>>;
        boardComments?: unknown;
      }>;
    };
    persisted.version = 5;
    delete persisted.rooms[0].boardComments;
    persisted.rooms[0].boardItems = [{
      id: "photo_legacy",
      kind: "photo",
      ownerActorId: session.viewer.actorId,
      variant: "one",
      note: null,
      x: 10,
      y: 12,
      rotation: 0,
      width: 24,
      comments: [{ id: "comment_legacy", actorId: session.viewer.actorId, body: "Still here", createdAt: TEST_NOW_ISO }],
    }];

    const restored = parsePersistedMockSession(JSON.stringify(persisted));

    expect(restored?.rooms[0].boardComments).toEqual([{
      id: "comment_legacy",
      photoId: "photo_legacy",
      actorId: session.viewer.actorId,
      body: "Still here",
      createdAt: TEST_NOW_ISO,
    }]);
    expect(restored?.rooms[0].boardItems[0]).not.toHaveProperty("comments");
  });
});

describe("board comment commands", () => {
  const photo = {
    id: "photo_test",
    kind: "photo" as const,
    ownerActorId: actorId("actor_test_host"),
    variant: "one" as const,
    note: null,
    x: 10,
    y: 10,
    rotation: 0,
    width: 24,
  };

  it("stores comments separately from the photo entity", () => {
    const base = createTestSession();
    const session: MockSession = { ...base, rooms: [{ ...base.rooms[0], boardItems: [photo] }] };
    const action = {
      type: "COMMAND" as const,
      command: {
        type: "ADD_BOARD_COMMENT" as const,
        roomPublicId: session.rooms[0].publicId,
        actorId: session.viewer.actorId,
        nowIso: TEST_NOW_ISO,
        itemId: photo.id,
        comment: { id: "comment_test", body: "  A separate comment  " },
      },
    };

    const result = mockSessionReducer(session, action);
    const repeated = mockSessionReducer(result, action);

    expect(result.rooms[0].boardItems[0]).toEqual(photo);
    expect(result.rooms[0].boardComments).toEqual([{
      id: "comment_test",
      photoId: photo.id,
      actorId: session.viewer.actorId,
      body: "A separate comment",
      createdAt: TEST_NOW_ISO,
    }]);
    expect(repeated.rooms[0].boardComments).toHaveLength(1);
  });

  it("rejects comments for a missing photo", () => {
    const session = createTestSession();
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: {
        type: "ADD_BOARD_COMMENT",
        roomPublicId: session.rooms[0].publicId,
        actorId: session.viewer.actorId,
        nowIso: TEST_NOW_ISO,
        itemId: "photo_missing",
        comment: { id: "comment_missing", body: "Nowhere" },
      },
    });

    expect(result.rooms[0].boardComments).toEqual([]);
  });

  it("deletes photo comments with their photo", () => {
    const base = createTestSession();
    const session: MockSession = {
      ...base,
      rooms: [{
        ...base.rooms[0],
        boardItems: [photo],
        boardComments: [{ id: "comment_test", photoId: photo.id, actorId: base.viewer.actorId, body: "A comment", createdAt: TEST_NOW_ISO }],
      }],
    };
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: {
        type: "DELETE_BOARD_ITEM",
        roomPublicId: session.rooms[0].publicId,
        actorId: session.viewer.actorId,
        nowIso: TEST_NOW_ISO,
        itemId: photo.id,
      },
    });

    expect(result.rooms[0].boardItems).toEqual([]);
    expect(result.rooms[0].boardComments).toEqual([]);
  });
});

describe("END_ITINERARY command", () => {
  const nowIso = "2030-01-01T11:00:00.000Z";
  const manualItem = createTestItinerary({ endMode: "manual", endsAt: null });

  it("ends an active manual itinerary with reducer-owned timestamps", () => {
    const session = createTestSession([manualItem]);
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: { type: "END_ITINERARY", roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, itemId: manualItem.id, nowIso },
    });

    expect(result.rooms[0].itinerary[0]).toMatchObject({ endedAt: nowIso, updatedAt: nowIso });
    expect(result.rooms[0].messages.at(-1)?.body).toBe("Lunch ended.");
  });

  it("is idempotent and does not append another system message", () => {
    const session = createTestSession([manualItem]);
    const action = {
      type: "COMMAND" as const,
      command: { type: "END_ITINERARY" as const, roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, itemId: manualItem.id, nowIso },
    };
    const ended = mockSessionReducer(session, action);
    const repeated = mockSessionReducer(ended, action);

    expect(repeated.rooms[0].itinerary[0].endedAt).toBe(nowIso);
    expect(repeated.rooms[0].messages).toHaveLength(ended.rooms[0].messages.length);
  });

  it("rejects a non-responsible member", () => {
    const session = createTestSession([manualItem]);
    const memberSession: MockSession = {
      ...session,
      viewer: {
        ...session.viewer,
        actorId: testMember.actorId,
        displayName: testMember.displayName,
        initials: testMember.initials,
      },
    };
    const result = mockSessionReducer(memberSession, {
      type: "COMMAND",
      command: { type: "END_ITINERARY", roomPublicId: session.rooms[0].publicId, actorId: testMember.actorId, itemId: manualItem.id, nowIso },
    });

    expect(result.rooms[0].itinerary[0].endedAt).toBeNull();
  });

  it("rejects an update that attempts to forge endedAt", () => {
    const session = createTestSession([manualItem]);
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: {
        type: "UPDATE_ITINERARY",
        roomPublicId: session.rooms[0].publicId,
        actorId: actorId("actor_test_host"),
        nowIso,
        item: { ...manualItem, endedAt: nowIso, updatedAt: nowIso },
      },
    });

    expect(result.rooms[0].itinerary[0].endedAt).toBeNull();
  });
});

describe("backend-facing command validation", () => {
  it("accepts a valid board text item without local asset storage", () => {
    const session = createTestSession();
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: {
        type: "ADD_BOARD_ITEM",
        roomPublicId: session.rooms[0].publicId,
        actorId: session.viewer.actorId,
        nowIso: TEST_NOW_ISO,
        item: { id: "note_test", kind: "note", ownerActorId: session.viewer.actorId, text: "Saved locally", x: 18, y: 16, rotation: 0, variant: "paper" },
      },
    });

    expect(result.rooms[0].boardItems).toContainEqual(expect.objectContaining({ id: "note_test", text: "Saved locally" }));
  });

  it("persists memoir page placement and paper style independently", () => {
    const session = createTestSession();
    const withPage = mockSessionReducer(session, {
      type: "COMMAND",
      command: { type: "ADD_MEMOIR_SPREAD", roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, nowIso: TEST_NOW_ISO },
    });
    const withNote = mockSessionReducer(withPage, {
      type: "COMMAND",
      command: {
        type: "ADD_BOARD_ITEM",
        roomPublicId: session.rooms[0].publicId,
        actorId: session.viewer.actorId,
        nowIso: TEST_NOW_ISO,
        item: { id: "memoir_note", kind: "note", ownerActorId: session.viewer.actorId, text: "Page two", x: 0, y: 0, rotation: 0, memoirPage: 2 },
      },
    });
    const result = mockSessionReducer(withNote, {
      type: "COMMAND",
      command: { type: "SET_MEMOIR_PAGE_STYLE", roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, nowIso: TEST_NOW_ISO, pageNumber: 2, style: "sage" },
    });

    expect(result.rooms[0].boardItems).toContainEqual(expect.objectContaining({ id: "memoir_note", memoirPage: 2 }));
    expect(result.rooms[0].memoirPageStyles).toEqual({ "2": "sage" });
    expect(result.rooms[0].memoirPageCount).toBe(4);
  });

  it("saves a memoir photo and its pinned caption atomically", () => {
    const session = createTestSession();
    const photo = { id: "memoir_photo", kind: "photo" as const, ownerActorId: session.viewer.actorId, variant: "one" as const, note: null, x: 0, y: 0, rotation: 0, width: 24, memoirPage: 1 };
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: { type: "ADD_MEMOIR_PHOTO", roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, nowIso: TEST_NOW_ISO, item: photo, caption: { id: "caption_one", body: "A pinned memory" } },
    });

    expect(result.rooms[0].boardItems).toContainEqual(photo);
    expect(result.rooms[0].boardComments).toContainEqual(expect.objectContaining({ id: "caption_one", photoId: photo.id, kind: "caption" }));
  });

  it("rejects malformed media content at the command boundary", () => {
    const session = createTestSession();
    const malformedMessage = {
      id: "message_invalid_asset",
      kind: "message",
      author: session.rooms[0].members[0],
      body: "",
      sentAt: TEST_NOW_ISO,
      isOwn: true,
      reactions: [],
      content: { type: "image", asset: { id: "", kind: "image", mimeType: "image/jpeg", byteSize: -1 }, name: "bad.jpg", aspectRatio: 1 },
    } as unknown as ChatMessage;
    const result = mockSessionReducer(session, {
      type: "COMMAND",
      command: { type: "POST_MESSAGE", roomPublicId: session.rooms[0].publicId, actorId: session.viewer.actorId, nowIso: TEST_NOW_ISO, message: malformedMessage },
    });

    expect(result).toBe(session);
  });
});
