import type { ActorId, RoomId, RoomPublicId } from "./ids";

export type RoomMode = "host-led" | "community-led";
export type RoomStatus = "active" | "archived";
export type RoomRole = "host" | "admin" | "member";
export type MembershipState = "active" | "muted" | "removed";
export type ArtVariant = "one" | "two" | "three" | "four";
export type BoardBackground = "stone" | "linen" | "charcoal" | "herbarium" | "clover" | "bluebell";
export type BoardNoteVariant = "paper" | "ink" | "sage";
export type BoardFrameVariant = "pin" | "gallery" | "instant" | "tape" | "dark";

export interface BoardComment {
  readonly id: string;
  readonly actorId: ActorId;
  readonly body: string;
  readonly createdAt: string;
}

export interface PersonSummary {
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly initials: string;
  readonly role: RoomRole;
  readonly isGuest: boolean;
}

export interface RoomSummary {
  readonly id: RoomId;
  readonly publicId: RoomPublicId;
  readonly name: string;
  readonly description: string;
  readonly mode: RoomMode;
  readonly status: RoomStatus;
  readonly timeZone: string;
  readonly endsAt: string | null;
  readonly archivedAt: string | null;
  readonly memberCount: number;
  readonly photoCount: number;
  readonly boardPreview: readonly ArtVariant[];
  readonly boardNote: string;
  readonly boardBackground: BoardBackground;
  readonly isFavorite: boolean;
}

export interface ChatMessage {
  readonly id: string;
  readonly kind: "message" | "system";
  readonly author: PersonSummary | null;
  readonly body: string;
  readonly sentAt: string;
  readonly isOwn: boolean;
  readonly reactions: readonly { readonly emoji: string; readonly count: number }[];
  readonly replyToId?: string;
  readonly content?:
    | { readonly type: "image"; readonly dataUrl: string; readonly name: string; readonly aspectRatio: number }
    | { readonly type: "location"; readonly latitude: number; readonly longitude: number; readonly label: string }
    | { readonly type: "voice"; readonly durationSeconds: number; readonly dataUrl: string; readonly mimeType: string };
}

export interface PollPreview {
  readonly id: string;
  readonly question: string;
  readonly closesAt: string;
  readonly memberSnapshot: number;
  readonly requiredVotes: number;
  readonly visibility: "public" | "anonymous";
  readonly choices: readonly { readonly id: string; readonly label: string; readonly votes: number }[];
}

export interface BoardPhoto {
  readonly id: string;
  readonly kind: "photo";
  readonly ownerActorId: ActorId;
  readonly variant: ArtVariant;
  readonly imageDataUrl?: string;
  readonly imageName?: string;
  readonly aspectRatio?: number;
  readonly frameVariant?: BoardFrameVariant;
  readonly note: string | null;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly width: number;
  readonly comments?: readonly BoardComment[];
}

export interface BoardNote {
  readonly id: string;
  readonly kind: "note";
  readonly ownerActorId: ActorId;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly width?: number;
  readonly height?: number;
  readonly variant?: BoardNoteVariant;
}

export interface BoardDrawing {
  readonly id: string;
  readonly kind: "drawing";
  readonly ownerActorId: ActorId;
  readonly imageDataUrl: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly width: number;
  readonly height: number;
}

export type BoardItem = BoardPhoto | BoardNote | BoardDrawing;

export interface ItineraryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly locationLabel: string | null;
  readonly mapsUrl: string | null;
  readonly responsible: PersonSummary;
  readonly createdByActorId: ActorId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoomDetail extends RoomSummary {
  readonly memberListVisibility: "members" | "moderators";
  readonly members: readonly PersonSummary[];
  readonly messages: readonly ChatMessage[];
  readonly activePoll: PollPreview | null;
  readonly boardItems: readonly BoardItem[];
  readonly itinerary: readonly ItineraryItem[];
}

export interface ViewerMembership {
  readonly roomId: RoomId;
  readonly role: RoomRole;
  readonly state: MembershipState;
  readonly archiveEligible: boolean;
}

export interface ViewerContext {
  readonly actorId: ActorId;
  readonly authState: "guest" | "signed-in";
  readonly memberships: readonly ViewerMembership[];
}

export interface RoomCapabilities {
  readonly canRead: boolean;
  readonly canChat: boolean;
  readonly canVote: boolean;
  readonly canAddBoardItem: boolean;
  readonly canCreateItinerary: boolean;
  readonly canModerate: boolean;
  readonly canChangeDuration: boolean;
  readonly canEndRoom: boolean;
}
