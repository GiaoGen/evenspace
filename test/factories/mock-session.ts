import { actorId, roomId, roomPublicId } from "@/core/domain/ids";
import type { ItineraryItem, PersonSummary } from "@/core/domain/room";
import { initialCreateRoomDraft } from "@/features/create-room/model/create-room-machine";
import {
  MOCK_SESSION_VERSION,
  createRoomFromDraft,
  type MockRoom,
  type MockSession,
  type MockViewer,
} from "@/features/mock-session/model/mock-session";

export const TEST_NOW_ISO = "2030-01-01T10:00:00.000Z";

export const testHost: PersonSummary = {
  actorId: actorId("actor_test_host"),
  displayName: "Test Host",
  initials: "TH",
  role: "host",
  isGuest: false,
};

export const testMember: PersonSummary = {
  actorId: actorId("actor_test_member"),
  displayName: "Test Member",
  initials: "TM",
  role: "member",
  isGuest: false,
};

export function createTestItinerary(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "itinerary_test",
    title: "Lunch",
    description: "Shared table",
    startsAt: "2030-01-01T10:30:00.000Z",
    endMode: "scheduled",
    endsAt: "2030-01-01T11:30:00.000Z",
    endedAt: null,
    locationLabel: "Studio",
    mapsUrl: null,
    responsible: testHost,
    createdByActorId: testHost.actorId,
    createdAt: TEST_NOW_ISO,
    updatedAt: TEST_NOW_ISO,
    ...overrides,
  };
}

export function createTestSession(items: readonly ItineraryItem[] = []): MockSession {
  const viewer: MockViewer = {
    actorId: testHost.actorId,
    displayName: testHost.displayName,
    initials: testHost.initials,
    email: "host@example.test",
    authState: "signed-in",
    theme: "system",
  };
  const room = createRoomFromDraft(
    {
      ...initialCreateRoomDraft,
      name: "Test room",
      durationMinutes: 180,
      acceptedTerms: true,
    },
    viewer,
    {
      id: roomId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      publicId: roomPublicId("room_test"),
    },
    TEST_NOW_ISO,
  );
  const roomWithMembers: MockRoom = {
    ...room,
    memberCount: 2,
    members: [...room.members, testMember],
    membershipStates: {
      ...room.membershipStates,
      [testMember.actorId]: "active",
    },
    itinerary: items,
  };
  return {
    version: MOCK_SESSION_VERSION,
    sessionId: "test_session",
    viewer,
    rooms: [roomWithMembers],
  };
}
