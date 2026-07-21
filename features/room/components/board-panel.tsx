"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardBackground, BoardComment, BoardFrameVariant, BoardItem, BoardNoteVariant, BoardPhoto, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { saveLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { BoardCanvas } from "./board/board-canvas";
import { BoardChrome } from "./board/board-chrome";
import { DoodleStudio } from "./board/doodle-studio";
import { compressImage, validateImageFile } from "./board/image-upload";
import { NoteStudio } from "./board/note-studio";
import { PhotoDetailViewer } from "./board/photo-detail-viewer";
import { PhotoFrameStudio, type PendingBoardPhoto } from "./board/photo-frame-studio";
import { SequenceView } from "./board/sequence-view";
import styles from "./board/board.module.css";

const photoVariants: readonly ArtVariant[] = ["one", "two", "three", "four"];
const backgroundClasses: Record<BoardBackground, string> = {
  stone: styles.boardBgStone,
  linen: styles.boardBgLinen,
  charcoal: styles.boardBgCharcoal,
  herbarium: styles.boardBgHerbarium,
  clover: styles.boardBgClover,
  bluebell: styles.boardBgBluebell,
};

type Studio = "note" | "doodle" | null;
type Tray = "create" | "background" | null;

function nextPlacement(items: readonly BoardItem[]) {
  if (!items.length) return { x: 18, y: 16, rotation: -2 };
  const index = items.length;
  const anchor = items[index - 1];
  return { x: anchor.x + 7 + index % 3 * 2, y: anchor.y + 6 + index % 2 * 3, rotation: [-4, 3, -2, 4, 1][index % 5] };
}

export function BoardPanel({ roomPublicId, items, comments, members, canAdd, canModerate, viewerActorId, photoCount, maxPhotos, sequence, setSequence, boardBackground }: { readonly roomPublicId: RoomPublicId; readonly items: readonly BoardItem[]; readonly comments: readonly BoardComment[]; readonly members: readonly PersonSummary[]; readonly canAdd: boolean; readonly canModerate: boolean; readonly viewerActorId: ActorId; readonly photoCount: number; readonly maxPhotos: number; readonly sequence: boolean; readonly setSequence: (value: boolean) => void; readonly boardBackground: BoardBackground }) {
  const { session, dispatch } = useMockSession();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const fitAfterAddRef = useRef(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tray, setTray] = useState<Tray>(null);
  const [studio, setStudio] = useState<Studio>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingBoardPhoto | null>(null);
  const [detailPhotoId, setDetailPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photos = items.filter((item): item is BoardPhoto => item.kind === "photo");
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const detailPhoto = photos.find((item) => item.id === detailPhotoId) ?? null;
  const detailComments = detailPhoto ? comments.filter((comment) => comment.photoId === detailPhoto.id) : [];
  const canDeleteSelected = Boolean(selectedItem && (selectedItem.ownerActorId === viewerActorId || canModerate));
  const commandBase = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  useEffect(() => {
    if (!fitAfterAddRef.current) return;
    fitAfterAddRef.current = false;
    const frame = window.requestAnimationFrame(() => fitRef.current?.());
    return () => window.cancelAnimationFrame(frame);
  }, [items.length]);

  function finishEditing() {
    setSelectedItemId(null);
    setTray(null);
  }

  function addItem(item: BoardItem) {
    fitAfterAddRef.current = true;
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item } });
    setStudio(null);
    setTray(null);
    setError(null);
  }

  function addNote(text: string, variant: BoardNoteVariant) {
    addItem({ id: `board_note_${createUuid()}`, kind: "note", ownerActorId: viewerActorId, text, variant, ...nextPlacement(items) });
  }

  async function addDoodle(blob: Blob) {
    try {
      const asset = await saveLocalAsset(blob, "image");
      addItem({ id: `board_drawing_${createUuid()}`, kind: "drawing", ownerActorId: viewerActorId, asset, width: 22, height: 16, ...nextPlacement(items), rotation: 0 });
    } catch { setError("This drawing could not be saved locally."); }
  }

  async function addPhoto(frameVariant: BoardFrameVariant) {
    if (!pendingPhoto) return;
    try {
      const asset = await saveLocalAsset(pendingPhoto.blob, "image");
      const index = items.length;
      addItem({ id: `board_photo_${createUuid()}`, kind: "photo", ownerActorId: viewerActorId, variant: photoVariants[index % photoVariants.length], frameVariant, asset, imageName: pendingPhoto.name, aspectRatio: pendingPhoto.aspectRatio, note: null, width: 24, ...nextPlacement(items) });
      URL.revokeObjectURL(pendingPhoto.previewUrl);
      setPendingPhoto(null);
    } catch { setError("This photo could not be saved locally."); }
  }

  async function addLocalPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = validateImageFile(file);
    if (validation) { setError(validation); return; }
    try {
      const image = await compressImage(file);
      setPendingPhoto({ ...image, previewUrl: URL.createObjectURL(image.blob), name: file.name.slice(0, 120) });
      setTray(null);
      setError(null);
    } catch {
      setError("This photo could not be read here. Try JPEG, PNG, WebP, or a smaller original.");
    }
  }

  function removeSelected() {
    if (!selectedItem) return;
    dispatch({ type: "COMMAND", command: { type: "DELETE_BOARD_ITEM", ...commandBase(), itemId: selectedItem.id } });
    finishEditing();
  }

  function removePhoto(itemId: string) {
    const index = photos.findIndex((item) => item.id === itemId);
    const adjacentPhoto = photos[index + 1] ?? photos[index - 1] ?? null;
    dispatch({ type: "COMMAND", command: { type: "DELETE_BOARD_ITEM", ...commandBase(), itemId } });
    setDetailPhotoId(adjacentPhoto?.id ?? null);
  }

  function selectItem(item: BoardItem) {
    setTray(null);
    if (item.kind === "photo") {
      setSelectedItemId(null);
      setDetailPhotoId(item.id);
      return;
    }
    setSelectedItemId(item.id);
  }

  function selectBackground(background: BoardBackground) {
    dispatch({ type: "COMMAND", command: { type: "SET_BOARD_BACKGROUND", ...commandBase(), background } });
    setTray(null);
  }

  function addComment(itemId: string, body: string) {
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_COMMENT", ...commandBase(), itemId, comment: { id: `board_comment_${createUuid()}`, body } } });
  }

  return <div className={`${styles.boardPanel} ${backgroundClasses[boardBackground]}`}>
    {sequence
      ? <SequenceView items={items} onSelect={selectItem} onClear={finishEditing} />
      : <BoardCanvas items={items} viewerActorId={viewerActorId} selectedItemId={selectedItemId} onSelect={selectItem} onClear={finishEditing} onMove={(item, dx, dy) => dispatch({ type: "COMMAND", command: { type: "MOVE_BOARD_ITEM", ...commandBase(), itemId: item.id, x: item.x + dx, y: item.y + dy } })} onResize={(itemId, width, height) => dispatch({ type: "COMMAND", command: { type: "RESIZE_BOARD_ITEM", ...commandBase(), itemId, width, height } })} onFitReady={(fit) => { fitRef.current = fit; }} />}

    <input ref={cameraInputRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" onChange={addLocalPhoto} />
    <input ref={albumInputRef} className={styles.fileInput} type="file" accept="image/*" onChange={addLocalPhoto} />

    {canDeleteSelected ? <button type="button" className={styles.deleteAction} onClick={removeSelected} aria-label="Delete selected board item"><Icon name="trash" /></button> : null}
    {!sequence && studio === null && pendingPhoto === null ? <BoardChrome tray={tray} background={boardBackground} canAdd={canAdd} photoLimitReached={photoCount >= maxPhotos} error={error} onTray={(next) => { setTray(next); setSelectedItemId(null); setError(null); }} onFit={() => { finishEditing(); fitRef.current?.(); }} onCamera={() => cameraInputRef.current?.click()} onAlbum={() => albumInputRef.current?.click()} onNote={() => { setStudio("note"); setTray(null); }} onDoodle={() => { setStudio("doodle"); setTray(null); }} onBackground={selectBackground} /> : null}
    {sequence ? <button type="button" className={styles.sequenceReturn} onClick={() => { setSequence(false); finishEditing(); window.requestAnimationFrame(() => fitRef.current?.()); }}><Icon name="board" /><span>Board</span></button> : null}
    {studio === "note" ? <NoteStudio onClose={() => setStudio(null)} onAdd={addNote} /> : null}
    {studio === "doodle" ? <DoodleStudio backgroundClass={backgroundClasses[boardBackground]} onClose={() => setStudio(null)} onAdd={addDoodle} /> : null}
    {pendingPhoto ? <PhotoFrameStudio photo={pendingPhoto} onClose={() => { URL.revokeObjectURL(pendingPhoto.previewUrl); setPendingPhoto(null); }} onAdd={addPhoto} /> : null}
    {detailPhoto ? <PhotoDetailViewer photo={detailPhoto} photos={photos} comments={detailComments} members={members} canDelete={detailPhoto.ownerActorId === viewerActorId || canModerate} onClose={() => setDetailPhotoId(null)} onPhotoChange={setDetailPhotoId} onComment={(body) => addComment(detailPhoto.id, body)} onDelete={() => removePhoto(detailPhoto.id)} /> : null}
  </div>;
}
