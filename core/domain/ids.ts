declare const roomIdBrand: unique symbol;
declare const roomPublicIdBrand: unique symbol;
declare const actorIdBrand: unique symbol;

export type RoomId = string & { readonly [roomIdBrand]: true };
export type RoomPublicId = string & { readonly [roomPublicIdBrand]: true };
export type ActorId = string & { readonly [actorIdBrand]: true };

const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROOM_PUBLIC_ID_PATTERN = /^room_[a-z0-9_]{3,40}$/;
const ACTOR_ID_PATTERN = /^actor_[a-z0-9_]{3,40}$/;

export function parseRoomId(value: string): RoomId | null {
  return ROOM_ID_PATTERN.test(value) ? (value as RoomId) : null;
}

export function parseRoomPublicId(value: string): RoomPublicId | null {
  return ROOM_PUBLIC_ID_PATTERN.test(value) ? (value as RoomPublicId) : null;
}

export function parseActorId(value: string): ActorId | null {
  return ACTOR_ID_PATTERN.test(value) ? (value as ActorId) : null;
}

export function roomId(value: string): RoomId {
  const parsed = parseRoomId(value);
  if (!parsed) throw new Error("Invalid room fixture id");
  return parsed;
}

export function roomPublicId(value: string): RoomPublicId {
  const parsed = parseRoomPublicId(value);
  if (!parsed) throw new Error("Invalid public room fixture id");
  return parsed;
}

export function actorId(value: string): ActorId {
  const parsed = parseActorId(value);
  if (!parsed) throw new Error("Invalid actor fixture id");
  return parsed;
}
