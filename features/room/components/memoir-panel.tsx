"use client";

import { useCallback, useMemo, useState } from "react";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardComment, BoardItem, BoardPhoto, ChatMessage, MemoirPaperStyle, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { saveLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { PhotoDetailViewer } from "./board/photo-detail-viewer";
import { compressImage, validateImageFile } from "./board/image-upload";
import { BookReader } from "./memoir/book-reader";
import { MemoirEditorToolbar } from "./memoir/memoir-add-dock";
import { createMemoirDocument } from "./memoir/memoir-model";
import { MemoirPhotoCaption, type PendingMemoirPhoto } from "./memoir/memoir-photo-caption";
import { MemoirSpreadEditor } from "./memoir/memoir-spread-editor";
import { PhotosView } from "./memoir/photos-view";
import styles from "./memoir/memoir.module.css";

export type MemoirMode = "photos" | "book";

const photoVariants: readonly ArtVariant[] = ["one", "two", "three", "four"];

export function MemoirPanel({ roomPublicId, roomName, items, comments, messages, pageStyles, pageCount, members, mode, viewerActorId, canAdd, canModerate }: {
  readonly roomPublicId: RoomPublicId;
  readonly roomName: string;
  readonly items: readonly BoardItem[];
  readonly comments: readonly BoardComment[];
  readonly messages: readonly ChatMessage[];
  readonly pageStyles: Readonly<Record<string, MemoirPaperStyle>>;
  readonly pageCount: number;
  readonly members: readonly PersonSummary[];
  readonly mode: MemoirMode;
  readonly viewerActorId: ActorId;
  readonly canAdd: boolean;
  readonly canModerate: boolean;
}) {
  const { session, dispatch } = useMockSession();
  const [detailPhotoId, setDetailPhotoId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ readonly spreadId: string; readonly targetPage: number } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingMemoirPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const document = useMemo(() => createMemoirDocument(roomName, items, pageStyles, pageCount), [items, pageCount, pageStyles, roomName]);
  const photos = items.filter((item): item is BoardPhoto => item.kind === "photo");
  const detailPhoto = photos.find((photo) => photo.id === detailPhotoId) ?? null;
  const latestPage = document.pages.reduce((latest, page) => page.pageNumber ? Math.max(latest, page.pageNumber) : latest, 1);
  const targetPage = editing?.targetPage ?? latestPage;
  const editedSpread = document.spreads.find((spread) => spread.id === editing?.spreadId) ?? null;
  const usedPhotoAssetIds = new Set(photos.flatMap((photo) => photo.asset ? [photo.asset.id] : []));
  const commandBase = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  function addItem(item: BoardItem) {
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item } });
    setError(null);
  }

  function selectChatPhoto(message: ChatMessage) {
    if (message.content?.type === "image") setPendingPhoto({ source: "chat", message });
  }

  function addText(text: string, source?: ChatMessage) {
    const body = text.trim().slice(0, 500);
    if (!body) return;
    addItem({ id: `memoir_note_${createUuid()}`, kind: "note", ownerActorId: viewerActorId, sourceMessageId: source?.id, sourceActorId: source?.author?.actorId, text: body, x: 0, y: 0, rotation: 0, memoirPage: targetPage });
  }

  function selectPhoto(file: File) {
    const validation = validateImageFile(file);
    if (validation) { setError(validation); return; }
    setError(null);
    setPendingPhoto({ source: "local", file, previewUrl: URL.createObjectURL(file) });
  }

  function closePendingPhoto() {
    if (pendingPhoto?.source === "local") URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto(null);
  }

  async function confirmPhoto(caption: string) {
    try {
      if (!pendingPhoto) return;
      let photo: BoardPhoto;
      if (pendingPhoto.source === "chat" && pendingPhoto.message.content?.type === "image") {
        const content = pendingPhoto.message.content;
        photo = { id: `memoir_photo_${createUuid()}`, kind: "photo", ownerActorId: viewerActorId, sourceMessageId: pendingPhoto.message.id, sourceActorId: pendingPhoto.message.author?.actorId, variant: photoVariants[photos.length % photoVariants.length], asset: content.asset, imageName: content.name, aspectRatio: content.aspectRatio, note: null, x: 0, y: 0, rotation: 0, width: 24, memoirPage: targetPage };
      } else if (pendingPhoto.source === "local") {
        const image = await compressImage(pendingPhoto.file);
        const asset = await saveLocalAsset(image.blob, "image");
        photo = { id: `memoir_photo_${createUuid()}`, kind: "photo", ownerActorId: viewerActorId, variant: photoVariants[photos.length % photoVariants.length], asset, imageName: pendingPhoto.file.name.slice(0, 120), aspectRatio: image.aspectRatio, note: null, x: 0, y: 0, rotation: 0, width: 24, memoirPage: targetPage };
      } else return;
      dispatch({ type: "COMMAND", command: { type: "ADD_MEMOIR_PHOTO", ...commandBase(), item: photo, caption: caption ? { id: `board_caption_${createUuid()}`, body: caption } : null } });
      closePendingPhoto();
      setError(null);
    } catch {
      setError("This photo could not be saved locally.");
    }
  }

  function removeItem(itemId: string) {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;
    dispatch({ type: "COMMAND", command: { type: "DELETE_BOARD_ITEM", ...commandBase(), itemId } });
    if (target.kind === "photo" && detailPhotoId === itemId) setDetailPhotoId(null);
  }

  function removePhoto(itemId: string) {
    const index = photos.findIndex((photo) => photo.id === itemId);
    const adjacent = photos[index + 1] ?? photos[index - 1] ?? null;
    removeItem(itemId);
    setDetailPhotoId(adjacent?.id ?? null);
  }

  function setPaperStyle(style: MemoirPaperStyle) {
    dispatch({ type: "COMMAND", command: { type: "SET_MEMOIR_PAGE_STYLE", ...commandBase(), pageNumber: targetPage, style } });
  }

  function addPage() {
    dispatch({ type: "COMMAND", command: { type: "ADD_MEMOIR_SPREAD", ...commandBase() } });
  }

  const finishEditing = useCallback(() => setEditing(null), []);

  const canRemove = (item: BoardItem) => item.ownerActorId === viewerActorId || canModerate;

  return <div className={styles.memoirPanel}>
    <div key={mode} className={mode === "photos" ? styles.modeEnterPhotos : styles.modeEnterBook}>
      {mode === "photos" ? <PhotosView document={document} members={members} canEdit={canAdd} onEditSpread={(spreadId, pageNumber) => setEditing({ spreadId, targetPage: pageNumber })} onOpenPhoto={setDetailPhotoId} onAddPage={addPage} /> : <BookReader document={document} members={members} onOpenPhoto={setDetailPhotoId} />}
    </div>
    {mode === "photos" && editedSpread ? <MemoirSpreadEditor spread={editedSpread} members={members} canRemove={canRemove} onTargetPage={(pageNumber) => setEditing({ spreadId: editedSpread.id, targetPage: pageNumber })} onRemove={removeItem} onDone={finishEditing} tools={<MemoirEditorToolbar messages={messages} usedPhotoAssetIds={usedPhotoAssetIds} targetPage={targetPage} error={error} onSelectChatPhoto={selectChatPhoto} onAddText={addText} onSelectPhoto={selectPhoto} onPaperStyle={setPaperStyle} />} /> : null}
    {pendingPhoto ? <MemoirPhotoCaption pending={pendingPhoto} onClose={closePendingPhoto} onConfirm={confirmPhoto} /> : null}
    {detailPhoto ? <PhotoDetailViewer photo={detailPhoto} photos={photos} comments={comments.filter((comment) => comment.photoId === detailPhoto.id).toSorted((left, right) => Number(right.kind === "caption") - Number(left.kind === "caption"))} members={members} canDelete={canRemove(detailPhoto)} onClose={() => setDetailPhotoId(null)} onPhotoChange={setDetailPhotoId} onComment={(body) => dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_COMMENT", ...commandBase(), itemId: detailPhoto.id, comment: { id: `board_comment_${createUuid()}`, body } } })} onDelete={() => removePhoto(detailPhoto.id)} /> : null}
  </div>;
}
