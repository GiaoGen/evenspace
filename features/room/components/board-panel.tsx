"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardBackground, BoardItem, BoardNoteVariant, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { BoardCanvas } from "./board/board-canvas";
import { BoardChrome } from "./board/board-chrome";
import { DoodleStudio } from "./board/doodle-studio";
import { compressImage, validateImageFile } from "./board/image-upload";
import { NoteStudio } from "./board/note-studio";
import { SequenceView } from "./board/sequence-view";
import styles from "./board/board.module.css";

const photoVariants: readonly ArtVariant[] = ["one", "two", "three", "four"];
const backgroundClasses: Record<BoardBackground, string> = { stone: styles.boardBgStone, linen: styles.boardBgLinen, charcoal: styles.boardBgCharcoal };

type Studio = "note" | "doodle" | null;
type Tray = "create" | "background" | null;

function nextPlacement(items: readonly BoardItem[]) {
  if (!items.length) return { x: 18, y: 16, rotation: -2 };
  const index = items.length;
  const anchor = items[index - 1];
  return { x: anchor.x + 7 + index % 3 * 2, y: anchor.y + 6 + index % 2 * 3, rotation: [-4, 3, -2, 4, 1][index % 5] };
}

export function BoardPanel({ roomPublicId, items, members, canAdd, canModerate, viewerActorId, photoCount, maxPhotos, sequence, setSequence, boardBackground }: { readonly roomPublicId: RoomPublicId; readonly items: readonly BoardItem[]; readonly members: readonly PersonSummary[]; readonly canAdd: boolean; readonly canModerate: boolean; readonly viewerActorId: ActorId; readonly photoCount: number; readonly maxPhotos: number; readonly sequence: boolean; readonly setSequence: (value: boolean) => void; readonly boardBackground: BoardBackground }) {
  const { session, dispatch } = useMockSession();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const fitAfterAddRef = useRef(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tray, setTray] = useState<Tray>(null);
  const [studio, setStudio] = useState<Studio>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
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

  function addDoodle(imageDataUrl: string) {
    addItem({ id: `board_drawing_${createUuid()}`, kind: "drawing", ownerActorId: viewerActorId, imageDataUrl, width: 22, height: 16, ...nextPlacement(items), rotation: 0 });
  }

  async function addLocalPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = validateImageFile(file);
    if (validation) { setError(validation); return; }
    try {
      const image = await compressImage(file);
      const index = items.length;
      addItem({ id: `board_photo_${createUuid()}`, kind: "photo", ownerActorId: viewerActorId, variant: photoVariants[index % photoVariants.length], imageDataUrl: image.dataUrl, imageName: file.name, aspectRatio: image.aspectRatio, note: null, width: 24, ...nextPlacement(items) });
    } catch {
      setError("This photo could not be read here. Try JPEG, PNG, WebP, or a smaller original.");
    }
  }

  function removeSelected() {
    if (!selectedItem) return;
    dispatch({ type: "COMMAND", command: { type: "DELETE_BOARD_ITEM", ...commandBase(), itemId: selectedItem.id } });
    finishEditing();
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
      ? <SequenceView items={items} members={members} selectedItemId={selectedItemId} onSelect={(item) => { setSelectedItemId(item.id); setTray(null); }} onClear={finishEditing} onComment={addComment} />
      : <BoardCanvas items={items} members={members} viewerActorId={viewerActorId} selectedItemId={selectedItemId} onSelect={(item) => { setSelectedItemId(item.id); setTray(null); }} onClear={finishEditing} onMove={(item, dx, dy) => dispatch({ type: "COMMAND", command: { type: "MOVE_BOARD_ITEM", ...commandBase(), itemId: item.id, x: item.x + dx, y: item.y + dy } })} onResize={(itemId, width, height) => dispatch({ type: "COMMAND", command: { type: "RESIZE_BOARD_ITEM", ...commandBase(), itemId, width, height } })} onComment={addComment} onFitReady={(fit) => { fitRef.current = fit; }} />}

    <input ref={cameraInputRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" onChange={addLocalPhoto} />
    <input ref={albumInputRef} className={styles.fileInput} type="file" accept="image/*" onChange={addLocalPhoto} />

    {canDeleteSelected ? <button type="button" className={styles.deleteAction} onClick={removeSelected} aria-label="Delete selected board item"><Icon name="trash" /></button> : null}
    {!sequence && studio === null ? <BoardChrome tray={tray} background={boardBackground} canAdd={canAdd} photoLimitReached={photoCount >= maxPhotos} error={error} onTray={(next) => { setTray(next); setSelectedItemId(null); setError(null); }} onFit={() => { finishEditing(); fitRef.current?.(); }} onCamera={() => cameraInputRef.current?.click()} onAlbum={() => albumInputRef.current?.click()} onNote={() => { setStudio("note"); setTray(null); }} onDoodle={() => { setStudio("doodle"); setTray(null); }} onBackground={selectBackground} /> : null}
    {sequence ? <button type="button" className={styles.sequenceReturn} onClick={() => { setSequence(false); finishEditing(); window.requestAnimationFrame(() => fitRef.current?.()); }}><Icon name="board" /><span>Board</span></button> : null}
    {studio === "note" ? <NoteStudio onClose={() => setStudio(null)} onAdd={addNote} /> : null}
    {studio === "doodle" ? <DoodleStudio backgroundClass={backgroundClasses[boardBackground]} onClose={() => setStudio(null)} onAdd={addDoodle} /> : null}
  </div>;
}
