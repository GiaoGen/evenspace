import { parseActorId, parseRoomId, parseRoomPublicId, type ActorId, type RoomPublicId } from "@/core/domain/ids";
import { getBoardItemUnitSize } from "@/core/domain/board-layout";
import type { BoardBackground, BoardItem, ChatMessage, ItineraryItem, MembershipState, PersonSummary, PollPreview, RoomCapabilities, RoomDetail, RoomSummary } from "@/core/domain/room";
import type { CreateRoomDraft } from "@/features/create-room/model/create-room-machine";

export const MOCK_SESSION_VERSION = 3 as const;
export type MockRoomLifecycle = "active" | "freezing" | "archiving" | "archived";
export type JoinRequestState = "pending" | "approved" | "rejected";

export interface MockViewer {
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly initials: string;
  readonly email: string | null;
  readonly authState: "guest" | "signed-in";
  readonly theme: "system" | "light" | "dark";
}

export interface MockJoinRequest {
  readonly id: string;
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly initials: string;
  readonly note: string;
  readonly requestedAt: string;
  readonly state: JoinRequestState;
}

export interface MockPoll extends PollPreview {
  readonly voterActorIds: readonly ActorId[];
  readonly resolvedChoiceId: string | null;
  readonly proposal?:
    | { readonly kind: "itinerary"; readonly item: ItineraryItem }
    | { readonly kind: "extend-room"; readonly endsAt: string }
    | { readonly kind: "end-room" }
    | { readonly kind: "remove-member"; readonly targetActorId: ActorId };
}

export interface MockReport {
  readonly id: string;
  readonly reporterActorId: ActorId;
  readonly description: string;
  readonly createdAt: string;
  readonly hostReply: string | null;
}

export interface MockRoom extends Omit<RoomDetail, "activePoll"> {
  readonly lifecycle: MockRoomLifecycle;
  readonly activePoll: MockPoll | null;
  readonly pollHistory?: readonly MockPoll[];
  readonly createdAt: string;
  readonly inviteCode: string;
  readonly inviteRevision: number;
  readonly requiresApproval: boolean;
  readonly membershipStates: Readonly<Record<string, MembershipState | "banned">>;
  readonly archiveActorIds: readonly ActorId[];
  readonly archiveRemovedBy: readonly ActorId[];
  readonly joinRequests: readonly MockJoinRequest[];
  readonly pinnedMessageId: string | null;
  readonly memberLimit: number;
  readonly maxPhotos: number;
  readonly mediaLimitMb: number;
  readonly reports: readonly MockReport[];
}

export interface MockSession {
  readonly version: typeof MOCK_SESSION_VERSION;
  readonly sessionId: string;
  readonly viewer: MockViewer;
  readonly rooms: readonly MockRoom[];
}

type TimedRoomCommand = { readonly roomPublicId: RoomPublicId; readonly actorId: ActorId; readonly nowIso: string };
export type MockCommand =
  | { readonly type: "CREATE_ROOM"; readonly room: MockRoom; readonly actorId: ActorId }
  | { readonly type: "REQUEST_JOIN"; readonly roomPublicId: RoomPublicId; readonly request: MockJoinRequest; readonly inviteRevision: number }
  | { readonly type: "ASSUME_JOIN_IDENTITY"; readonly roomPublicId: RoomPublicId; readonly actorId: ActorId }
  | { readonly type: "COMPLETE_COMMUNITY_JOIN_DEMO"; readonly roomPublicId: RoomPublicId; readonly requestId: string; readonly actorId: ActorId; readonly nowIso: string }
  | ({ readonly type: "TOGGLE_FAVORITE" } & TimedRoomCommand)
  | ({ readonly type: "POST_MESSAGE"; readonly message: ChatMessage } & TimedRoomCommand)
  | ({ readonly type: "RECALL_MESSAGE"; readonly messageId: string } & TimedRoomCommand)
  | ({ readonly type: "DELETE_OWN_MESSAGE"; readonly messageId: string } & TimedRoomCommand)
  | ({ readonly type: "DELETE_MESSAGE"; readonly messageId: string } & TimedRoomCommand)
  | ({ readonly type: "REACT_MESSAGE"; readonly messageId: string; readonly emoji: string } & TimedRoomCommand)
  | ({ readonly type: "PIN_MESSAGE"; readonly messageId: string | null } & TimedRoomCommand)
  | ({ readonly type: "CREATE_POLL"; readonly poll: MockPoll } & TimedRoomCommand)
  | ({ readonly type: "CAST_VOTE"; readonly choiceId: string } & TimedRoomCommand)
  | ({ readonly type: "ADD_BOARD_ITEM"; readonly item: BoardItem } & TimedRoomCommand)
  | ({ readonly type: "SET_BOARD_BACKGROUND"; readonly background: BoardBackground } & TimedRoomCommand)
  | ({ readonly type: "MOVE_BOARD_ITEM"; readonly itemId: string; readonly x: number; readonly y: number } & TimedRoomCommand)
  | ({ readonly type: "RESIZE_BOARD_NOTE"; readonly itemId: string; readonly width: number; readonly height: number } & TimedRoomCommand)
  | ({ readonly type: "RESIZE_BOARD_ITEM"; readonly itemId: string; readonly width: number; readonly height: number } & TimedRoomCommand)
  | ({ readonly type: "DELETE_BOARD_ITEM"; readonly itemId: string } & TimedRoomCommand)
  | ({ readonly type: "ADD_ITINERARY"; readonly item: ItineraryItem } & TimedRoomCommand)
  | ({ readonly type: "SET_ITINERARY_STATUS"; readonly itemId: string; readonly status: ItineraryItem["status"] } & TimedRoomCommand)
  | ({ readonly type: "SET_ATTENDANCE"; readonly itemId: string; readonly attendance: ItineraryItem["viewerAttendance"] } & TimedRoomCommand)
  | ({ readonly type: "UPDATE_DURATION"; readonly endsAt: string } & TimedRoomCommand)
  | ({ readonly type: "ROTATE_INVITE"; readonly inviteCode: string } & TimedRoomCommand)
  | ({ readonly type: "REVIEW_JOIN"; readonly requestId: string; readonly decision: "approved" | "rejected" } & TimedRoomCommand)
  | ({ readonly type: "SET_MEMBER_STATE"; readonly targetActorId: ActorId; readonly state: MembershipState | "banned" } & TimedRoomCommand)
  | ({ readonly type: "SET_MEMBER_ROLE"; readonly targetActorId: ActorId; readonly role: PersonSummary["role"] } & TimedRoomCommand)
  | ({ readonly type: "SUBMIT_REPORT"; readonly report: MockReport } & TimedRoomCommand)
  | ({ readonly type: "REPLY_REPORT"; readonly reportId: string; readonly reply: string } & TimedRoomCommand)
  | ({ readonly type: "END_ROOM" } & TimedRoomCommand)
  | { readonly type: "ADVANCE_ARCHIVE"; readonly roomPublicId: RoomPublicId; readonly lifecycle: Exclude<MockRoomLifecycle, "active">; readonly nowIso: string }
  | { readonly type: "REMOVE_OWN_ARCHIVE"; readonly roomPublicId: RoomPublicId; readonly actorId: ActorId }
  | { readonly type: "REMOVE_OWN_ROOM"; readonly roomPublicId: RoomPublicId; readonly actorId: ActorId }
  | { readonly type: "UPDATE_PROFILE"; readonly actorId: ActorId; readonly displayName: string; readonly initials: string; readonly nowIso: string }
  | { readonly type: "SET_AUTH_STATE"; readonly actorId: ActorId; readonly authState: MockViewer["authState"]; readonly email: string | null }
  | { readonly type: "SET_THEME"; readonly theme: MockViewer["theme"] };

export type MockSessionAction = { readonly type: "HYDRATE" | "RESET"; readonly session: MockSession } | { readonly type: "COMMAND"; readonly command: MockCommand };

const asTime = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const memberFor = (room: MockRoom, actorId: ActorId) => room.members.find((member) => member.actorId === actorId) ?? null;
const activeMembership = (state: MembershipState | "banned" | undefined) => state !== "removed" && state !== "banned";
const activeMemberCount = (room: MockRoom) => room.members.filter((member) => activeMembership(room.membershipStates[member.actorId])).length;
const boardSize = getBoardItemUnitSize;
function boardPlacementAllowed(items: readonly BoardItem[], candidate: BoardItem, ignoreId?: string) {
  const size = boardSize(candidate);
  return items.every((item) => {
    if (item.id === ignoreId) return true;
    const other = boardSize(item);
    const overlapWidth = Math.max(0, Math.min(candidate.x + size.width, item.x + other.width) - Math.max(candidate.x, item.x));
    const overlapHeight = Math.max(0, Math.min(candidate.y + size.height, item.y + other.height) - Math.max(candidate.y, item.y));
    const overlap = overlapWidth * overlapHeight;
    if (overlap === 0) return true;
    if (candidate.kind === "note" || item.kind === "note") return false;
    return overlap / Math.min(size.width * size.height, other.width * other.height) <= 0.2;
  });
}
function snapBoardItem(items: readonly BoardItem[], item: BoardItem, ignoreId?: string): BoardItem | null {
  const offsets = [0, 6, -6, 12, -12, 18, -18, 24, -24, 30, -30];
  for (const radiusX of offsets) for (const radiusY of offsets) {
    const candidate = { ...item, x: item.x + radiusX, y: item.y + radiusY };
    if (boardPlacementAllowed(items, candidate, ignoreId)) return candidate;
  }
  return null;
}

export function deriveMockCapabilities(session: MockSession, room: MockRoom, nowIso: string): RoomCapabilities {
  const member = memberFor(room, session.viewer.actorId);
  const membership = room.membershipStates[session.viewer.actorId];
  const blocked = !member || membership === "removed" || membership === "banned";
  const archiveAllowed = room.archiveActorIds.includes(session.viewer.actorId) && !room.archiveRemovedBy.includes(session.viewer.actorId) && session.viewer.authState === "signed-in";
  const canRead = !blocked && (room.lifecycle !== "archived" || archiveAllowed);
  const writable = canRead && room.lifecycle === "active" && asTime(room.endsAt ?? "") > asTime(nowIso);
  const host = member?.role === "host";
  const admin = member?.role === "admin";
  const signedIn = session.viewer.authState === "signed-in";
  return { canRead, canChat: writable && membership !== "muted", canVote: writable && signedIn, canAddBoardItem: writable && signedIn && membership !== "muted", canCreateItinerary: writable && (host || admin), canModerate: writable && (host || admin), canChangeDuration: writable && Boolean(host), canEndRoom: writable && Boolean(host) };
}

function updateRoom(session: MockSession, publicId: RoomPublicId, update: (room: MockRoom) => MockRoom): MockSession {
  const index = session.rooms.findIndex((room) => room.publicId === publicId);
  if (index < 0) return session;
  const rooms = [...session.rooms];
  rooms[index] = update(rooms[index]);
  return { ...session, rooms };
}

function systemMessage(room: MockRoom, body: string, nowIso: string): MockRoom {
  const message: ChatMessage = { id: `system_${room.messages.length}_${asTime(nowIso)}`, kind: "system", author: null, body, sentAt: nowIso, isOwn: false, reactions: [] };
  return { ...room, messages: [...room.messages, message] };
}

function applyCommand(session: MockSession, command: MockCommand): MockSession {
  if (command.type === "SET_THEME") return { ...session, viewer: { ...session.viewer, theme: command.theme } };
  if (command.type === "SET_AUTH_STATE") return command.actorId === session.viewer.actorId ? { ...session, viewer: { ...session.viewer, authState: command.authState, email: command.authState === "signed-in" ? command.email : null } } : session;
  if (command.type === "UPDATE_PROFILE") {
    if (command.actorId !== session.viewer.actorId || !command.displayName.trim()) return session;
    const previous = session.viewer.displayName;
    const viewer = { ...session.viewer, displayName: command.displayName.trim().slice(0, 60), initials: command.initials.trim().slice(0, 3) };
    const duplicateName = session.rooms.some((room) => room.lifecycle === "active" && room.members.some((member) => member.actorId !== command.actorId && activeMembership(room.membershipStates[member.actorId]) && member.displayName.toLocaleLowerCase() === viewer.displayName.toLocaleLowerCase()));
    if (duplicateName) return session;
    const rooms = session.rooms.map((room) => {
      if (room.lifecycle !== "active" || !room.members.some((member) => member.actorId === command.actorId)) return room;
      const members = room.members.map((member) => member.actorId === command.actorId ? { ...member, displayName: viewer.displayName, initials: viewer.initials } : member);
      const messages = room.messages.map((message) => message.author?.actorId === command.actorId ? { ...message, author: { ...message.author, displayName: viewer.displayName, initials: viewer.initials } } : message);
      return systemMessage({ ...room, members, messages }, `${previous} changed their name to “${viewer.displayName}”.`, command.nowIso);
    });
    return { ...session, viewer, rooms };
  }
  if (command.type === "CREATE_ROOM") return command.actorId === session.viewer.actorId && session.viewer.authState === "signed-in" && !session.rooms.some((room) => room.publicId === command.room.publicId) ? { ...session, rooms: [command.room, ...session.rooms] } : session;
  if (command.type === "REQUEST_JOIN") return updateRoom(session, command.roomPublicId, (room) => {
    const duplicateName = room.members.some((member) => activeMembership(room.membershipStates[member.actorId]) && member.displayName.toLocaleLowerCase() === command.request.displayName.toLocaleLowerCase()) || room.joinRequests.some((request) => request.state === "pending" && request.displayName.toLocaleLowerCase() === command.request.displayName.toLocaleLowerCase());
    if (room.lifecycle !== "active" || room.inviteRevision !== command.inviteRevision || activeMemberCount(room) >= room.memberLimit || duplicateName) return room;
    if (!room.requiresApproval) {
      const member: PersonSummary = { actorId: command.request.actorId, displayName: command.request.displayName, initials: command.request.initials, role: "member", isGuest: true };
      return systemMessage({ ...room, members: [...room.members, member], memberCount: activeMemberCount(room) + 1, membershipStates: { ...room.membershipStates, [member.actorId]: "active" }, joinRequests: [...room.joinRequests, { ...command.request, state: "approved" }] }, `${member.displayName} joined the room.`, command.request.requestedAt);
    }
    const next = { ...room, joinRequests: [...room.joinRequests, command.request] };
    if (room.mode !== "community-led" || room.activePoll && !room.activePoll.resolvedChoiceId && asTime(room.activePoll.closesAt) > asTime(command.request.requestedAt)) return next;
    const snapshot = activeMemberCount(room);
    const poll: MockPoll = { id: `join:${command.request.id}`, question: `Let ${command.request.displayName} join?`, closesAt: room.endsAt ?? command.request.requestedAt, memberSnapshot: snapshot, requiredVotes: Math.floor(snapshot / 2) + 1, visibility: "public", choices: [{ id: "approve", label: "Let them in", votes: 0 }, { id: "reject", label: "Not this time", votes: 0 }], voterActorIds: [], resolvedChoiceId: null };
    return { ...next, activePoll: poll, pollHistory: [...(next.pollHistory ?? []), poll] };
  });
  if (command.type === "ASSUME_JOIN_IDENTITY") {
    const room = session.rooms.find((item) => item.publicId === command.roomPublicId);
    const member = room?.members.find((item) => item.actorId === command.actorId);
    if (!room || !member || !activeMembership(room.membershipStates[member.actorId])) return session;
    return { ...session, viewer: { ...session.viewer, actorId: member.actorId, displayName: member.displayName, initials: member.initials, email: null, authState: "guest" } };
  }
  if (command.type === "COMPLETE_COMMUNITY_JOIN_DEMO") return updateRoom(session, command.roomPublicId, (room) => {
    const request = room.joinRequests.find((item) => item.id === command.requestId && item.state === "pending");
    const poll = room.activePoll;
    if (room.mode !== "community-led" || !request || !poll || poll.id !== `join:${request.id}` || !memberFor(room, command.actorId) || activeMemberCount(room) >= room.memberLimit) return room;
    const member: PersonSummary = { actorId: request.actorId, displayName: request.displayName, initials: request.initials, role: "member", isGuest: true };
    const choices = poll.choices.map((choice) => choice.id === "approve" ? { ...choice, votes: poll.requiredVotes } : choice);
    const voters = room.members.filter((item) => activeMembership(room.membershipStates[item.actorId])).slice(0, poll.requiredVotes).map((item) => item.actorId);
    const resolvedPoll = { ...poll, choices, voterActorIds: voters, resolvedChoiceId: "approve" };
    return systemMessage({ ...room, activePoll: resolvedPoll, pollHistory: room.pollHistory?.length ? room.pollHistory.map((item) => item.id === resolvedPoll.id ? resolvedPoll : item) : [resolvedPoll], joinRequests: room.joinRequests.map((item) => item.id === request.id ? { ...item, state: "approved" } : item), members: [...room.members, member], memberCount: activeMemberCount(room) + 1, membershipStates: { ...room.membershipStates, [member.actorId]: "active" } }, `${member.displayName} joined after the Mock majority simulation.`, command.nowIso);
  });
  if (command.type === "ADVANCE_ARCHIVE") return updateRoom(session, command.roomPublicId, (room) => {
    const allowed = room.lifecycle === "freezing" && command.lifecycle === "archiving" || room.lifecycle === "archiving" && command.lifecycle === "archived";
    if (!allowed) return room;
    return command.lifecycle === "archived" ? { ...room, lifecycle: "archived", status: "archived", archivedAt: command.nowIso, endsAt: null } : { ...room, lifecycle: command.lifecycle };
  });
  if (command.type === "REMOVE_OWN_ARCHIVE") return updateRoom(session, command.roomPublicId, (room) => room.lifecycle === "archived" && command.actorId === session.viewer.actorId && room.archiveActorIds.includes(command.actorId) ? { ...room, archiveRemovedBy: [...new Set([...room.archiveRemovedBy, command.actorId])] } : room);
  if (command.type === "REMOVE_OWN_ROOM") return command.actorId === session.viewer.actorId ? updateRoom(session, command.roomPublicId, (room) => memberFor(room, command.actorId) || room.archiveActorIds.includes(command.actorId) ? { ...room, archiveRemovedBy: [...new Set([...room.archiveRemovedBy, command.actorId])] } : room) : session;

  const room = session.rooms.find((item) => item.publicId === command.roomPublicId);
  if (!room || command.actorId !== session.viewer.actorId) return session;
  const capabilities = deriveMockCapabilities(session, room, command.nowIso);
  const actor = memberFor(room, command.actorId);
  if (command.type === "TOGGLE_FAVORITE") return capabilities.canRead ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, isFavorite: !value.isFavorite })) : session;
  if (command.type === "POST_MESSAGE") return capabilities.canChat && actor && command.message.author?.actorId === actor.actorId ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, messages: [...value.messages, command.message] })) : session;
  if (command.type === "RECALL_MESSAGE") return capabilities.canChat ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, messages: value.messages.filter((message) => message.id !== command.messageId || message.author?.actorId !== command.actorId || asTime(command.nowIso) - asTime(message.sentAt) > 120_000) })) : session;
  if (command.type === "DELETE_OWN_MESSAGE") return capabilities.canChat ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, messages: value.messages.filter((message) => message.id !== command.messageId || message.author?.actorId !== command.actorId) })) : session;
  if (command.type === "DELETE_MESSAGE") return capabilities.canModerate ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, messages: value.messages.filter((message) => message.id !== command.messageId) })) : session;
  if (command.type === "REACT_MESSAGE") return capabilities.canChat ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, messages: value.messages.map((message) => message.id !== command.messageId ? message : { ...message, reactions: message.reactions.some((reaction) => reaction.emoji === command.emoji) ? message.reactions.map((reaction) => reaction.emoji === command.emoji ? { ...reaction, count: reaction.count + 1 } : reaction) : [...message.reactions, { emoji: command.emoji, count: 1 }] }) })) : session;
  if (command.type === "PIN_MESSAGE") return capabilities.canModerate ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, pinnedMessageId: command.messageId })) : session;
  if (command.type === "CREATE_POLL") {
    const poll = command.poll;
    const choicesValid = poll.choices.length >= 2 && poll.choices.length <= 5 && new Set(poll.choices.map((choice) => choice.id)).size === poll.choices.length && poll.choices.every((choice) => choice.id && choice.label.trim() && choice.votes === 0);
    const snapshot = activeMemberCount(room);
    const closesAt = asTime(poll.closesAt);
    const proposal = poll.proposal;
    const proposalValid = !proposal
      || proposal.kind === "itinerary" && asTime(proposal.item.startsAt) <= asTime(room.endsAt ?? proposal.item.startsAt) && room.members.some((member) => member.actorId === proposal.item.responsible.actorId) && proposal.item.capacity >= 1 && proposal.item.capacity <= room.memberLimit
      || proposal.kind === "extend-room" && asTime(proposal.endsAt) > asTime(room.endsAt ?? command.nowIso) && asTime(proposal.endsAt) <= asTime(command.nowIso) + 24 * 60 * 60_000
      || proposal.kind === "end-room"
      || proposal.kind === "remove-member" && memberFor(room, proposal.targetActorId)?.role !== "host" && proposal.targetActorId !== command.actorId;
    const valid = Boolean(poll.question.trim()) && poll.question.length <= 160 && choicesValid && poll.memberSnapshot === snapshot && poll.requiredVotes === Math.floor(snapshot / 2) + 1 && closesAt > asTime(command.nowIso) && (!room.endsAt || closesAt <= asTime(room.endsAt)) && proposalValid;
    const priorPollClosed = !room.activePoll || Boolean(room.activePoll.resolvedChoiceId) || asTime(room.activePoll.closesAt) <= asTime(command.nowIso);
    return capabilities.canVote && (room.mode === "community-led" || capabilities.canModerate) && priorPollClosed && valid ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, activePoll: poll, pollHistory: [...(value.pollHistory ?? []), poll] })) : session;
  }
  if (command.type === "CAST_VOTE") return capabilities.canVote && room.activePoll && !room.activePoll.resolvedChoiceId && asTime(room.activePoll.closesAt) > asTime(command.nowIso) && room.activePoll.choices.some((choice) => choice.id === command.choiceId) && !room.activePoll.voterActorIds.includes(command.actorId) ? updateRoom(session, command.roomPublicId, (value) => {
    if (!value.activePoll) return value;
    const choices = value.activePoll.choices.map((choice) => choice.id === command.choiceId ? { ...choice, votes: choice.votes + 1 } : choice);
    const winner = choices.find((choice) => choice.votes >= value.activePoll!.requiredVotes);
    const poll = { ...value.activePoll, choices, voterActorIds: [...value.activePoll.voterActorIds, command.actorId], resolvedChoiceId: winner?.id ?? null };
    let next: MockRoom = { ...value, activePoll: poll, pollHistory: value.pollHistory?.length ? value.pollHistory.map((item) => item.id === poll.id ? poll : item) : [poll] };
    if (winner?.id === "yes" && poll.proposal?.kind === "itinerary") next = { ...next, itinerary: [...next.itinerary, poll.proposal.item].sort((a, b) => asTime(a.startsAt) - asTime(b.startsAt)) };
    if (winner?.id === "yes" && poll.proposal?.kind === "extend-room") next = { ...next, endsAt: poll.proposal.endsAt };
    if (winner?.id === "yes" && poll.proposal?.kind === "end-room") next = { ...next, lifecycle: "freezing", archiveActorIds: next.members.filter((member) => activeMembership(next.membershipStates[member.actorId])).map((member) => member.actorId) };
    if (winner?.id === "yes" && poll.proposal?.kind === "remove-member") {
      const wasActive = activeMembership(next.membershipStates[poll.proposal.targetActorId]);
      next = { ...next, memberCount: Math.max(0, next.memberCount - Number(wasActive)), membershipStates: { ...next.membershipStates, [poll.proposal.targetActorId]: "removed" } };
    }
    if (winner && poll.id.startsWith("join:")) {
      const requestId = poll.id.slice(5);
      const request = next.joinRequests.find((item) => item.id === requestId && item.state === "pending");
      if (request) {
        const approved = winner.id === "approve" && activeMemberCount(next) < next.memberLimit;
        const joinRequests = next.joinRequests.map((item) => item.id === requestId ? { ...item, state: approved ? "approved" as const : "rejected" as const } : item);
        if (approved) {
          const member: PersonSummary = { actorId: request.actorId, displayName: request.displayName, initials: request.initials, role: "member", isGuest: true };
          next = systemMessage({ ...next, joinRequests, members: [...next.members, member], memberCount: activeMemberCount(next) + 1, membershipStates: { ...next.membershipStates, [member.actorId]: "active" } }, `${member.displayName} joined the room.`, command.nowIso);
        } else next = { ...next, joinRequests };
      }
    }
    return next;
  }) : session;
  if (command.type === "ADD_BOARD_ITEM") return capabilities.canAddBoardItem && command.item.ownerActorId === command.actorId && (command.item.kind !== "photo" || room.photoCount < room.maxPhotos) ? updateRoom(session, command.roomPublicId, (value) => {
    const placed = snapBoardItem(value.boardItems, command.item);
    return placed ? { ...value, boardItems: [...value.boardItems, placed], photoCount: value.photoCount + (placed.kind === "photo" ? 1 : 0) } : value;
  }) : session;
  if (command.type === "SET_BOARD_BACKGROUND") return capabilities.canAddBoardItem ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, boardBackground: command.background })) : session;
  if (command.type === "MOVE_BOARD_ITEM") return capabilities.canAddBoardItem ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, boardItems: value.boardItems.map((item) => {
    if (item.id !== command.itemId || item.ownerActorId !== command.actorId) return item;
    return snapBoardItem(value.boardItems, { ...item, x: command.x, y: command.y }, item.id) ?? item;
  }) })) : session;
  if (command.type === "RESIZE_BOARD_NOTE") return capabilities.canAddBoardItem ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, boardItems: value.boardItems.map((item) => item.id === command.itemId && item.kind === "note" && item.ownerActorId === command.actorId ? { ...item, width: Math.min(Math.max(command.width, 10), 42), height: Math.min(Math.max(command.height, 6), 32) } : item) })) : session;
  if (command.type === "RESIZE_BOARD_ITEM") return capabilities.canAddBoardItem ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, boardItems: value.boardItems.map((item) => {
    if (item.id !== command.itemId || item.ownerActorId !== command.actorId) return item;
    if (item.kind === "note") return { ...item, width: Math.min(Math.max(command.width, 10), 42), height: Math.min(Math.max(command.height, 6), 32) };
    if (item.kind === "drawing") return { ...item, width: Math.min(Math.max(command.width, 10), 42), height: Math.min(Math.max(command.height, 8), 34) };
    return item;
  }) })) : session;
  if (command.type === "DELETE_BOARD_ITEM") return capabilities.canAddBoardItem || capabilities.canModerate ? updateRoom(session, command.roomPublicId, (value) => {
    const target = value.boardItems.find((item) => item.id === command.itemId);
    if (!target || target.ownerActorId !== command.actorId && !capabilities.canModerate) return value;
    return { ...value, boardItems: value.boardItems.filter((item) => item.id !== command.itemId), photoCount: Math.max(0, value.photoCount - (target.kind === "photo" ? 1 : 0)) };
  }) : session;
  if (command.type === "ADD_ITINERARY") return capabilities.canCreateItinerary && asTime(command.item.startsAt) <= asTime(room.endsAt ?? command.item.startsAt) && command.item.capacity >= 1 && command.item.capacity <= room.memberLimit && room.members.some((member) => member.actorId === command.item.responsible.actorId) ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, itinerary: [...value.itinerary, command.item].sort((a, b) => asTime(a.startsAt) - asTime(b.startsAt)) })) : session;
  if (command.type === "SET_ITINERARY_STATUS") return capabilities.canRead && room.lifecycle === "active" && asTime(room.endsAt ?? "") > asTime(command.nowIso) && actor ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, itinerary: value.itinerary.map((item) => item.id === command.itemId && (capabilities.canModerate || item.responsible.actorId === command.actorId) ? { ...item, status: command.status } : item) })) : session;
  if (command.type === "SET_ATTENDANCE") return capabilities.canRead && room.lifecycle === "active" && asTime(room.endsAt ?? "") > asTime(command.nowIso) ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, itinerary: value.itinerary.map((item) => {
    if (item.id !== command.itemId) return item;
    const wasGoing = item.viewerAttendance === "going" || item.viewerAttendance === "checked-in";
    const willGo = command.attendance === "going" || command.attendance === "checked-in";
    if (!wasGoing && willGo && item.goingCount >= item.capacity) return item;
    return { ...item, viewerAttendance: command.attendance, goingCount: item.goingCount + Number(willGo) - Number(wasGoing) };
  }) })) : session;
  if (command.type === "UPDATE_DURATION") return capabilities.canChangeDuration && asTime(command.endsAt) > asTime(command.nowIso) && asTime(command.endsAt) <= asTime(command.nowIso) + 24 * 60 * 60_000 ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, endsAt: command.endsAt })) : session;
  if (command.type === "ROTATE_INVITE") return capabilities.canModerate ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, inviteCode: command.inviteCode, inviteRevision: value.inviteRevision + 1 })) : session;
  if (command.type === "REVIEW_JOIN") return capabilities.canModerate ? updateRoom(session, command.roomPublicId, (value) => {
    const request = value.joinRequests.find((item) => item.id === command.requestId && item.state === "pending");
    if (!request) return value;
    const decision = command.decision === "approved" && activeMemberCount(value) >= value.memberLimit ? "rejected" : command.decision;
    const joinRequests = value.joinRequests.map((item) => item.id === command.requestId ? { ...item, state: decision } : item);
    if (decision === "rejected") return { ...value, joinRequests };
    const member: PersonSummary = { actorId: request.actorId, displayName: request.displayName, initials: request.initials, role: "member", isGuest: true };
    return systemMessage({ ...value, joinRequests, members: [...value.members, member], memberCount: activeMemberCount(value) + 1, membershipStates: { ...value.membershipStates, [request.actorId]: "active" } }, `${request.displayName} joined the room.`, command.nowIso);
  }) : session;
  if (command.type === "SET_MEMBER_STATE") return capabilities.canModerate && command.targetActorId !== command.actorId && memberFor(room, command.targetActorId)?.role !== "host" ? updateRoom(session, command.roomPublicId, (value) => {
    const wasActive = activeMembership(value.membershipStates[command.targetActorId]);
    const isActive = activeMembership(command.state);
    return { ...value, memberCount: Math.max(0, value.memberCount + Number(isActive) - Number(wasActive)), membershipStates: { ...value.membershipStates, [command.targetActorId]: command.state } };
  }) : session;
  if (command.type === "SET_MEMBER_ROLE") return actor?.role === "host" && command.targetActorId !== command.actorId && (command.role === "admin" || command.role === "member") && memberFor(room, command.targetActorId)?.role !== "host" ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, members: value.members.map((member) => member.actorId === command.targetActorId ? { ...member, role: command.role } : member) })) : session;
  if (command.type === "SUBMIT_REPORT") return capabilities.canRead && command.report.reporterActorId === command.actorId && command.report.description.trim() ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, reports: [...value.reports, { ...command.report, description: command.report.description.trim().slice(0,1000) }] })) : session;
  if (command.type === "REPLY_REPORT") return actor?.role === "host" && command.reply.trim() ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, reports: value.reports.map((report) => report.id === command.reportId ? { ...report, hostReply: command.reply.trim().slice(0,500) } : report) })) : session;
  if (command.type === "END_ROOM") return capabilities.canEndRoom ? updateRoom(session, command.roomPublicId, (value) => ({ ...value, lifecycle: "freezing", archiveActorIds: value.members.filter((member) => activeMembership(value.membershipStates[member.actorId])).map((member) => member.actorId) })) : session;
  return session;
}

export function mockSessionReducer(state: MockSession, action: MockSessionAction): MockSession {
  return action.type === "COMMAND" ? applyCommand(state, action.command) : action.session;
}

export function toRoomSummary(room: MockRoom): RoomSummary {
  return { id: room.id, publicId: room.publicId, name: room.name, description: room.description, mode: room.mode, status: room.lifecycle === "active" ? "active" : "archived", timeZone: room.timeZone, endsAt: room.endsAt, archivedAt: room.archivedAt, memberCount: activeMemberCount(room), photoCount: room.photoCount, boardPreview: room.boardPreview, boardNote: room.boardNote, boardBackground: room.boardBackground ?? "stone", isFavorite: room.isFavorite };
}

export const selectVisibleRooms = (session: MockSession, nowIso: string) => session.rooms.filter((room) => deriveMockCapabilities(session, room, nowIso).canRead && !room.archiveRemovedBy.includes(session.viewer.actorId));

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown, max: number, allowEmpty = true) => typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
const isIso = (value: unknown, nullable = false) => nullable && value === null || typeof value === "string" && Number.isFinite(Date.parse(value));
const isInt = (value: unknown, min: number, max: number) => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const isActor = (value: unknown) => typeof value === "string" && Boolean(parseActorId(value));
const isPerson = (value: unknown) => isRecord(value) && isActor(value.actorId) && isText(value.displayName, 60, false) && isText(value.initials, 3, false) && ["host", "admin", "member"].includes(String(value.role)) && typeof value.isGuest === "boolean";
const isMessageContent = (value: unknown) => value === undefined || isRecord(value) && (
  value.type === "image" && typeof value.dataUrl === "string" && value.dataUrl.startsWith("data:image/") && value.dataUrl.length <= 1_200_000 && isText(value.name, 120) && Number.isFinite(value.aspectRatio) && Number(value.aspectRatio) > 0
  || value.type === "location" && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Number(value.latitude) >= -90 && Number(value.latitude) <= 90 && Number(value.longitude) >= -180 && Number(value.longitude) <= 180 && isText(value.label, 120, false)
  || value.type === "voice" && isInt(value.durationSeconds, 1, 60) && typeof value.dataUrl === "string" && value.dataUrl.startsWith("data:audio/") && value.dataUrl.length <= 1_200_000 && isText(value.mimeType, 80, false)
);
const isMessage = (value: unknown) => isRecord(value) && isText(value.id, 100, false) && ["message", "system"].includes(String(value.kind)) && (value.author === null || isPerson(value.author)) && isText(value.body, 2000) && isIso(value.sentAt) && isMessageContent(value.content) && Array.isArray(value.reactions) && value.reactions.length <= 24 && value.reactions.every((reaction) => isRecord(reaction) && isText(reaction.emoji, 16, false) && isInt(reaction.count, 0, 100000));
const isBoardItem = (value: unknown) => isRecord(value) && isText(value.id, 100, false) && isActor(value.ownerActorId) && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.rotation) && (value.kind === "note" ? isText(value.text, 500, false) && (value.width === undefined || Number.isFinite(value.width)) && (value.height === undefined || Number.isFinite(value.height)) : value.kind === "drawing" ? typeof value.imageDataUrl === "string" && value.imageDataUrl.startsWith("data:image/") && value.imageDataUrl.length <= 1_200_000 && Number.isFinite(value.width) && Number.isFinite(value.height) : value.kind === "photo" && ["one", "two", "three", "four"].includes(String(value.variant)) && (value.note === null || isText(value.note, 500)) && (value.imageDataUrl === undefined || typeof value.imageDataUrl === "string" && value.imageDataUrl.startsWith("data:image/") && value.imageDataUrl.length <= 3_200_000) && (value.imageName === undefined || isText(value.imageName, 120)) && (value.aspectRatio === undefined || Number.isFinite(value.aspectRatio) && Number(value.aspectRatio) > 0) && Number.isFinite(value.width));
const isItinerary = (value: unknown) => isRecord(value) && isText(value.id, 100, false) && isText(value.title, 80, false) && isText(value.description, 500) && isIso(value.startsAt) && (value.locationLabel === null || isText(value.locationLabel, 120)) && (value.mapsUrl === null || isText(value.mapsUrl, 500)) && isPerson(value.responsible) && ["not-started", "in-progress", "completed"].includes(String(value.status)) && isInt(value.capacity, 1, 100) && isInt(value.goingCount, 0, 100) && [null, "going", "not-going", "checked-in"].includes(value.viewerAttendance as never);
const isJoinRequest = (value: unknown) => isRecord(value) && isText(value.id, 100, false) && isActor(value.actorId) && isText(value.displayName, 60, false) && isText(value.initials, 3, false) && isText(value.note, 240) && isIso(value.requestedAt) && ["pending", "approved", "rejected"].includes(String(value.state));
const isReport = (value: unknown) => isRecord(value) && isText(value.id, 100, false) && isActor(value.reporterActorId) && isText(value.description, 1000, false) && isIso(value.createdAt) && (value.hostReply === null || isText(value.hostReply, 500, false));
const isProposal = (value: unknown) => value === undefined || isRecord(value) && (value.kind === "itinerary" && isItinerary(value.item) || value.kind === "extend-room" && isIso(value.endsAt) || value.kind === "end-room" || value.kind === "remove-member" && isActor(value.targetActorId));
const isPoll = (value: unknown) => value === null || isRecord(value) && isText(value.id, 120, false) && isText(value.question, 160, false) && isIso(value.closesAt) && isInt(value.memberSnapshot, 1, 100) && isInt(value.requiredVotes, 1, 100) && ["public", "anonymous"].includes(String(value.visibility)) && Array.isArray(value.choices) && value.choices.length >= 2 && value.choices.length <= 5 && value.choices.every((choice) => isRecord(choice) && isText(choice.id, 60, false) && isText(choice.label, 120, false) && isInt(choice.votes, 0, 100)) && Array.isArray(value.voterActorIds) && value.voterActorIds.length <= 100 && value.voterActorIds.every(isActor) && (value.resolvedChoiceId === null || isText(value.resolvedChoiceId, 60, false)) && isProposal(value.proposal);

function isMockRoom(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string" || !parseRoomId(value.id) || typeof value.publicId !== "string" || !parseRoomPublicId(value.publicId)) return false;
  if (!isText(value.name, 80, false) || !isText(value.description, 500) || !["host-led", "community-led"].includes(String(value.mode)) || !["active", "archived"].includes(String(value.status)) || !["active", "freezing", "archiving", "archived"].includes(String(value.lifecycle))) return false;
  if (!isText(value.timeZone, 80, false) || !["stone", "linen", "charcoal"].includes(String(value.boardBackground ?? "stone")) || !isIso(value.endsAt, true) || !isIso(value.archivedAt, true) || !isIso(value.createdAt) || !isInt(value.memberCount, 0, 100) || !isInt(value.memberLimit, 2, 100) || !isInt(value.photoCount, 0, 500) || !isInt(value.maxPhotos, 1, 500) || !isInt(value.mediaLimitMb, 1, 100000)) return false;
  if (!Array.isArray(value.members) || value.members.length > 100 || !value.members.every(isPerson) || !Array.isArray(value.messages) || value.messages.length > 5000 || !value.messages.every(isMessage) || !Array.isArray(value.boardItems) || value.boardItems.length > 500 || !value.boardItems.every(isBoardItem) || !Array.isArray(value.itinerary) || value.itinerary.length > 500 || !value.itinerary.every(isItinerary)) return false;
  if (!isPoll(value.activePoll) || value.pollHistory !== undefined && (!Array.isArray(value.pollHistory) || value.pollHistory.length > 500 || !value.pollHistory.every((item) => item !== null && isPoll(item))) || !Array.isArray(value.joinRequests) || value.joinRequests.length > 500 || !value.joinRequests.every(isJoinRequest) || !Array.isArray(value.reports) || value.reports.length > 500 || !value.reports.every(isReport)) return false;
  if (!Array.isArray(value.archiveActorIds) || !value.archiveActorIds.every(isActor) || !Array.isArray(value.archiveRemovedBy) || !value.archiveRemovedBy.every(isActor) || !isRecord(value.membershipStates) || !Object.entries(value.membershipStates).every(([id, state]) => isActor(id) && ["active", "muted", "removed", "banned"].includes(String(state)))) return false;
  return isText(value.inviteCode, 40, false) && isInt(value.inviteRevision, 1, 1000000) && typeof value.requiresApproval === "boolean" && (value.pinnedMessageId === null || isText(value.pinnedMessageId, 100, false));
}

export function parsePersistedMockSession(value: string): MockSession | null {
  try {
    const candidate = JSON.parse(value) as Partial<MockSession>;
    if (candidate.version !== MOCK_SESSION_VERSION || typeof candidate.sessionId !== "string" || !candidate.viewer || !Array.isArray(candidate.rooms)) return null;
    if (typeof candidate.viewer.actorId !== "string" || !parseActorId(candidate.viewer.actorId) || typeof candidate.viewer.displayName !== "string" || candidate.viewer.authState !== "guest" && candidate.viewer.authState !== "signed-in" || !["system","light","dark"].includes(candidate.viewer.theme ?? "")) return null;
    if (!candidate.rooms.every(isMockRoom)) return null;
    return candidate as MockSession;
  } catch { return null; }
}

export function createRoomFromDraft(draft: CreateRoomDraft, viewer: MockViewer, ids: Pick<MockRoom, "id" | "publicId">, nowIso: string): MockRoom {
  const now = asTime(nowIso);
  const creator: PersonSummary = { actorId: viewer.actorId, displayName: viewer.displayName, initials: viewer.initials, role: draft.leadership === "host-led" ? "host" : "member", isGuest: false };
  return { id: ids.id, publicId: ids.publicId, name: draft.name.trim(), description: draft.description.trim(), mode: draft.leadership, status: "active", lifecycle: "active", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", endsAt: new Date(now + draft.durationMinutes * 60_000).toISOString(), archivedAt: null, memberCount: 1, photoCount: 0, boardPreview: ["one"], boardNote: draft.name.trim().toLocaleLowerCase(), boardBackground: "stone", isFavorite: false, memberListVisibility: draft.leadership === "community-led" ? "members" : draft.memberListVisibility, members: [creator], messages: [{ id: `system_created_${now}`, kind: "system", author: null, body: `${viewer.displayName} created the room.`, sentAt: nowIso, isOwn: false, reactions: [] }], activePoll: null, pollHistory: [], boardItems: [], itinerary: [], createdAt: nowIso, inviteCode: `E${Math.floor(now / 1000).toString(36).slice(-5).toUpperCase()}`, inviteRevision: 1, requiresApproval: draft.requiresApproval, membershipStates: { [viewer.actorId]: "active" }, archiveActorIds: [viewer.actorId], archiveRemovedBy: [], joinRequests: [], pinnedMessageId: null, memberLimit: draft.memberLimit, maxPhotos: 25, mediaLimitMb: 250, reports: [] };
}
