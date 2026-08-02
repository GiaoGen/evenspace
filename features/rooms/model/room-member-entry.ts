const enteredRoomMemberPreviews = new Set<string>();

export function getRoomMemberEntryKey(scope: string | undefined, roomId: string) {
  return `${scope ?? "device"}:${roomId}`;
}

export function hasEnteredRoomMemberPreview(key: string) {
  return enteredRoomMemberPreviews.has(key);
}

export function markRoomMemberPreviewEntered(key: string) {
  enteredRoomMemberPreviews.add(key);
}
