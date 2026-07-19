import { actorId, parseRoomId, parseRoomPublicId, roomId, roomPublicId } from "@/core/domain/ids";
import type { RoomDetail, ViewerContext } from "@/core/domain/room";

const avery = {
  actorId: actorId("actor_avery"),
  displayName: "Avery Morgan",
  initials: "AM",
  role: "host",
  isGuest: false,
} as const;

const maya = {
  actorId: actorId("actor_maya"),
  displayName: "Maya Lin",
  initials: "M",
  role: "admin",
  isGuest: false,
} as const;

const jon = {
  actorId: actorId("actor_jon"),
  displayName: "Jon Bell",
  initials: "J",
  role: "member",
  isGuest: false,
} as const;

const leah = {
  actorId: actorId("actor_leah"),
  displayName: "Leah Park",
  initials: "LP",
  role: "member",
  isGuest: true,
} as const;

export const mockViewer: ViewerContext = {
  actorId: avery.actorId,
  authState: "signed-in",
  memberships: [
    { roomId: roomId("11111111-1111-4111-8111-111111111111"), role: "host", state: "active", archiveEligible: true },
    { roomId: roomId("22222222-2222-4222-8222-222222222222"), role: "member", state: "active", archiveEligible: true },
    { roomId: roomId("33333333-3333-4333-8333-333333333333"), role: "member", state: "active", archiveEligible: true },
  ],
};

const roomFixtures = [
  {
    id: roomId("11111111-1111-4111-8111-111111111111"),
    publicId: roomPublicId("room_after_rain"),
    name: "After the rain",
    description: "Rain stopped. Nobody wanted to go home yet.",
    mode: "host-led",
    status: "active",
    timeZone: "Asia/Taipei",
    endsAt: "2027-07-14T22:30:00+08:00",
    archivedAt: null,
    memberCount: 7,
    photoCount: 18,
    boardPreview: ["one", "four", "three"],
    boardNote: "after the rain",
    boardBackground: "stone",
    isFavorite: true,
    memberListVisibility: "members",
    members: [avery, maya, jon, leah],
    messages: [
      { id: "message_1", kind: "system", author: null, body: "Maya changed the room name to “After the rain”.", sentAt: "2026-07-14T18:18:00+08:00", isOwn: false, reactions: [] },
      { id: "message_2", kind: "message", author: maya, body: "The light is unreal right now.", sentAt: "2026-07-14T18:42:00+08:00", isOwn: false, reactions: [{ emoji: "♥", count: 3 }] },
      { id: "message_3", kind: "message", author: maya, body: "Meet by the lower entrance?", sentAt: "2026-07-14T18:42:30+08:00", isOwn: false, reactions: [] },
      { id: "message_4", kind: "message", author: avery, body: "Yes. I’ll bring the speaker.", sentAt: "2026-07-14T18:43:00+08:00", isOwn: true, reactions: [] },
      { id: "message_5", kind: "message", author: jon, body: "I’m ten minutes away — save me a dry chair.", sentAt: "2026-07-14T18:47:00+08:00", isOwn: false, reactions: [{ emoji: "☻", count: 2 }] },
    ],
    activePoll: {
      id: "poll_dinner_time",
      question: "Move dinner to 8:30?",
      closesAt: "2026-07-14T19:15:00+08:00",
      memberSnapshot: 7,
      requiredVotes: 4,
      visibility: "public",
      choices: [
        { id: "choice_slow", label: "Yes, take it slow", votes: 4 },
        { id: "choice_keep", label: "Keep it at 8:00", votes: 2 },
      ],
    },
    boardItems: [
      { id: "board_photo_1", kind: "photo", ownerActorId: maya.actorId, variant: "one", note: "the air after the rain", x: 12, y: 15, rotation: -4, width: 24 },
      { id: "board_photo_2", kind: "photo", ownerActorId: jon.actorId, variant: "two", note: null, x: 53, y: 10, rotation: 4, width: 21 },
      { id: "board_photo_3", kind: "photo", ownerActorId: avery.actorId, variant: "three", note: "7:16 pm", x: 65, y: 53, rotation: 5, width: 25 },
      { id: "board_photo_4", kind: "photo", ownerActorId: leah.actorId, variant: "four", note: null, x: 31, y: 59, rotation: -3, width: 20 },
      { id: "board_note_1", kind: "note", ownerActorId: maya.actorId, text: "Don’t rush\nthis part.", x: 10, y: 65, rotation: 2 },
    ],
    itinerary: [
      { id: "itinerary_entrance", title: "Meet by the lower entrance", description: "Come down the riverside steps. Maya will wait by the stone wall.", startsAt: "2026-07-14T19:00:00+08:00", endsAt: "2026-07-14T19:45:00+08:00", locationLabel: "Riverside Walk", mapsUrl: "https://maps.google.com/?q=Riverside+Walk", responsible: maya, createdByActorId: maya.actorId, createdAt: "2026-07-14T18:25:00+08:00", updatedAt: "2026-07-14T18:25:00+08:00" },
      { id: "itinerary_dinner", title: "Dinner, wherever we land", description: "We’ll choose the place together after the walk.", startsAt: "2026-07-14T20:00:00+08:00", endsAt: "2026-07-14T21:30:00+08:00", locationLabel: "Place to be decided", mapsUrl: null, responsible: jon, createdByActorId: avery.actorId, createdAt: "2026-07-14T18:30:00+08:00", updatedAt: "2026-07-14T18:30:00+08:00" },
      { id: "itinerary_walk", title: "One last walk", description: "No fixed route. We’ll follow the river lights.", startsAt: "2026-07-14T22:00:00+08:00", endsAt: "2026-07-14T22:30:00+08:00", locationLabel: null, mapsUrl: null, responsible: avery, createdByActorId: avery.actorId, createdAt: "2026-07-14T18:35:00+08:00", updatedAt: "2026-07-14T18:35:00+08:00" },
    ],
  },
  {
    id: roomId("22222222-2222-4222-8222-222222222222"), publicId: roomPublicId("room_sunday_slowly"), name: "Sunday, slowly", description: "A long lunch that became an evening.", mode: "community-led", status: "archived", timeZone: "Asia/Taipei", endsAt: null, archivedAt: "2026-07-12T21:10:00+08:00", memberCount: 6, photoCount: 14, boardPreview: ["two", "one"], boardNote: "stay a little longer", boardBackground: "linen", isFavorite: false, memberListVisibility: "members",
    members: [avery, maya, jon], messages: [], activePoll: null,
    boardItems: [{ id: "board_sunday_1", kind: "photo", ownerActorId: maya.actorId, variant: "two", note: "one more coffee", x: 25, y: 20, rotation: -3, width: 27 }], itinerary: [],
  },
  {
    id: roomId("33333333-3333-4333-8333-333333333333"), publicId: roomPublicId("room_long_table"), name: "A very long table", description: "Everyone brought one more person.", mode: "host-led", status: "archived", timeZone: "Asia/Taipei", endsAt: null, archivedAt: "2026-06-28T23:40:00+08:00", memberCount: 9, photoCount: 25, boardPreview: ["three", "four", "one"], boardNote: "one very long table", boardBackground: "charcoal", isFavorite: true, memberListVisibility: "members",
    members: [avery, maya, jon, leah], messages: [], activePoll: null,
    boardItems: [{ id: "board_table_1", kind: "photo", ownerActorId: jon.actorId, variant: "three", note: "all together", x: 33, y: 25, rotation: 4, width: 28 }], itinerary: [],
  },
] satisfies readonly RoomDetail[];

export const rawRoomFixtures: unknown = roomFixtures;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function assertPerson(value: unknown) {
  if (!isRecord(value) || typeof value.actorId !== "string" || typeof value.displayName !== "string" || typeof value.initials !== "string") throw new Error("Room fixture has an invalid member");
  if (value.role !== "host" && value.role !== "admin" && value.role !== "member") throw new Error("Room fixture has an invalid member role");
  if (typeof value.isGuest !== "boolean") throw new Error("Room fixture has an invalid guest flag");
}

function assertBoardItem(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.ownerActorId !== "string") throw new Error("Room fixture has an invalid board item");
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.rotation)) throw new Error("Room fixture has invalid board coordinates");
  if (value.kind === "photo") {
    if (!isFiniteNumber(value.width) || typeof value.variant !== "string" || (value.note !== null && typeof value.note !== "string")) throw new Error("Room fixture has an invalid photo");
  } else if (value.kind === "note") {
    if (typeof value.text !== "string") throw new Error("Room fixture has an invalid note");
  } else if (value.kind === "drawing") {
    if (typeof value.imageDataUrl !== "string" || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) throw new Error("Room fixture has an invalid drawing");
  } else throw new Error("Room fixture has an invalid board item kind");
}

function assertItinerary(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || !isValidDate(value.startsAt)) throw new Error("Room fixture has an invalid itinerary item");
  if (!isValidDate(value.endsAt) || Date.parse(value.endsAt) <= Date.parse(value.startsAt) || !isRecord(value.responsible)) throw new Error("Room fixture has invalid itinerary timing");
  if (typeof value.createdByActorId !== "string" || !isValidDate(value.createdAt) || !isValidDate(value.updatedAt)) throw new Error("Room fixture has invalid itinerary ownership");
  if (value.mapsUrl !== null && typeof value.mapsUrl !== "string") throw new Error("Room fixture has an invalid maps value");
  assertPerson(value.responsible);
}

function assertRoomFixture(value: unknown): asserts value is RoomDetail {
  if (!isRecord(value)) throw new Error("Room fixture must be an object");
  if (typeof value.id !== "string" || !parseRoomId(value.id)) throw new Error("Room fixture has an invalid internal id");
  if (typeof value.publicId !== "string" || !parseRoomPublicId(value.publicId)) throw new Error("Room fixture has an invalid public id");
  if (typeof value.name !== "string" || value.name.length < 1 || value.name.length > 80) throw new Error("Room fixture has an invalid name");
  if (value.status !== "active" && value.status !== "archived") throw new Error("Room fixture has an invalid status");
  if (value.mode !== "host-led" && value.mode !== "community-led") throw new Error("Room fixture has an invalid mode");
  if (typeof value.timeZone !== "string" || value.timeZone.length > 64) throw new Error("Room fixture has an invalid time zone");
  if (!Array.isArray(value.members) || !Array.isArray(value.messages) || !Array.isArray(value.boardItems) || !Array.isArray(value.itinerary)) throw new Error("Room fixture collections are invalid");
  if (!Array.isArray(value.boardPreview) || value.boardPreview.length === 0) throw new Error("Room fixture needs a board preview");
  if (!["stone", "linen", "charcoal"].includes(String(value.boardBackground ?? "stone"))) throw new Error("Room fixture has invalid board background");
  if (!isFiniteNumber(value.memberCount) || !isFiniteNumber(value.photoCount)) throw new Error("Room fixture counts are invalid");
  if (value.status === "active" && !isValidDate(value.endsAt)) throw new Error("Active room fixture needs a valid end time");
  if (value.status === "archived" && !isValidDate(value.archivedAt)) throw new Error("Archived room fixture needs a valid archive time");
  if (value.memberListVisibility !== "members" && value.memberListVisibility !== "moderators") throw new Error("Room fixture has invalid member visibility");
  value.members.forEach(assertPerson);
  value.boardItems.forEach(assertBoardItem);
  value.itinerary.forEach(assertItinerary);
  value.messages.forEach((message) => {
    if (!isRecord(message) || typeof message.id !== "string" || typeof message.body !== "string" || !isValidDate(message.sentAt)) throw new Error("Room fixture has an invalid message");
    if (message.kind !== "message" && message.kind !== "system") throw new Error("Room fixture has an invalid message kind");
  });
}

export function getValidatedRoomFixtures(): readonly RoomDetail[] {
  if (!Array.isArray(rawRoomFixtures)) throw new Error("Room fixtures must be an array");
  rawRoomFixtures.forEach(assertRoomFixture);
  return rawRoomFixtures;
}
