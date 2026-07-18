"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { BOARD_UNIT, computeBoardFit, getBoardItemPixelSize, getBoardPhotoFrameAspectRatio } from "@/core/domain/board-layout";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardItem, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import styles from "./room-experience.module.css";

const LONG_PRESS_MS = 360;
const SAFE_MIN_SCALE = 0.001;
const MAX_LOCAL_PHOTO_BYTES = 12_000_000;
const MAX_LOCAL_PHOTO_DATA_URL_LENGTH = 3_000_000;
const IMAGE_FILE_PATTERN = /\.(avif|gif|heic|heif|jpeg|jpg|png|webp)$/i;
const variants: readonly ArtVariant[] = ["one", "two", "three", "four"];

type PanState = { readonly x: number; readonly y: number };
type DragState = { readonly itemId: string; readonly dx: number; readonly dy: number };
type ResizeState = { readonly itemId: string; readonly startX: number; readonly startY: number; readonly startWidth: number; readonly startHeight: number; readonly width: number; readonly height: number };
type GestureState = { readonly startDistance: number; readonly startScale: number; readonly startPan: PanState; readonly centerX: number; readonly centerY: number };
type PointerPoint = { readonly x: number; readonly y: number };
type CompressedImage = { readonly dataUrl: string; readonly aspectRatio: number };
type DoodleGestureState = { readonly startDistance: number; readonly startScale: number; readonly startPan: PanState; readonly startCenterX: number; readonly startCenterY: number };

const clamp = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
const drawingColors = ["#171613", "#9f3f35", "#52715f", "#49647f", "#c29b55"] as const;

function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_FILE_PATTERN.test(file.name);
}

function scaledSize(width: number, height: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function drawToDataUrl(width: number, height: number, draw: (context: CanvasRenderingContext2D, width: number, height: number) => void, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.fillStyle = "#f7f3ed";
  context.fillRect(0, 0, width, height);
  draw(context, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded."));
    };
    image.src = url;
  });
}

async function compressImage(file: File): Promise<CompressedImage> {
  const attempts = [
    { maxSide: 1600, quality: 0.74 },
    { maxSide: 1200, quality: 0.7 },
    { maxSide: 900, quality: 0.68 },
  ] as const;
  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    if (typeof createImageBitmap === "function") source = await createImageBitmap(file);
  } catch { source = null; }
  source ??= await decodeWithImageElement(file);

  const naturalWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const naturalHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!naturalWidth || !naturalHeight) throw new Error("Image has no readable dimensions.");

  try {
    for (const attempt of attempts) {
      const size = scaledSize(naturalWidth, naturalHeight, attempt.maxSide);
      const dataUrl = drawToDataUrl(size.width, size.height, (context, width, height) => context.drawImage(source, 0, 0, width, height), attempt.quality);
      if (dataUrl.length <= MAX_LOCAL_PHOTO_DATA_URL_LENGTH) return { dataUrl, aspectRatio: naturalWidth / naturalHeight };
    }
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
  throw new Error("Image is too large for session storage.");
}

export function BoardPanel({ roomPublicId, items, members, canAdd, canModerate, viewerActorId, photoCount, maxPhotos, sequence, setSequence }: { readonly roomPublicId: RoomPublicId; readonly items: readonly BoardItem[]; readonly members: readonly PersonSummary[]; readonly canAdd: boolean; readonly canModerate: boolean; readonly viewerActorId: ActorId; readonly photoCount: number; readonly maxPhotos: number; readonly sequence: boolean; readonly setSequence: (value: boolean) => void }) {
  const { session, dispatch } = useMockSession();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doodlePointerRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const doodlePointersRef = useRef(new Map<number, PointerPoint>());
  const doodleGestureRef = useRef<DoodleGestureState | null>(null);
  const fittedInitialViewRef = useRef(false);
  const panRef = useRef<{ active: boolean; pointerId: number; startX: number; startY: number; panX: number; panY: number }>({ active: false, pointerId: -1, startX: 0, startY: 0, panX: 0, panY: 0 });
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureState | null>(null);
  const itemPressRef = useRef<{ itemId: string; pointerId: number; startX: number; startY: number; timeout: number | null; moved: boolean } | null>(null);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [backgroundMenuOpen, setBackgroundMenuOpen] = useState(false);
  const [background, setBackground] = useState<"stone" | "linen" | "charcoal">("stone");
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [doodleComposerOpen, setDoodleComposerOpen] = useState(false);
  const [doodleColor, setDoodleColor] = useState<(typeof drawingColors)[number]>("#171613");
  const [doodleBrush, setDoodleBrush] = useState(6);
  const [doodleTool, setDoodleTool] = useState<"brush" | "eraser">("brush");
  const [brushPreviewVisible, setBrushPreviewVisible] = useState(false);
  const [doodleScale, setDoodleScale] = useState(1);
  const [doodlePan, setDoodlePan] = useState<PanState>({ x: 0, y: 0 });
  const [commentItemId, setCommentItemId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [photoComments, setPhotoComments] = useState<Record<string, readonly string[]>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const canDeleteSelected = Boolean(selectedItem && (selectedItem.ownerActorId === viewerActorId || canModerate));
  const commandBase = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  const fitBoardToItems = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0 || items.length === 0) {
      setPan({ x: 0, y: 0 });
      setScale(1);
      return;
    }
    const next = computeBoardFit(items, rect);
    setScale(next.scale);
    setPan({ x: next.x, y: next.y });
  }, [items]);

  useEffect(() => {
    if (sequence || fittedInitialViewRef.current) return;
    fittedInitialViewRef.current = true;
    const frame = window.requestAnimationFrame(fitBoardToItems);
    return () => window.cancelAnimationFrame(frame);
  }, [fitBoardToItems, sequence]);

  useEffect(() => {
    if (!doodleComposerOpen) return;
    const canvas = doodleCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f7f3ed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setDoodleScale(1);
    setDoodlePan({ x: 0, y: 0 });
    doodlePointersRef.current.clear();
    doodleGestureRef.current = null;
  }, [doodleComposerOpen]);

  function placement(width = 22) {
    const rect = viewportRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - pan.x) / scale / BOARD_UNIT : 24;
    const centerY = rect ? (rect.height / 2 - pan.y) / scale / BOARD_UNIT : 24;
    const offset = items.length % 6;
    return {
      x: centerX - width / 2 + offset * 2,
      y: centerY - width * 0.58 + offset * 1.5,
      rotation: [-4, 3, -2, 5, 1, -3][offset],
    };
  }

  function addNote() {
    if (!noteText.trim()) return;
    const placed = placement(18);
    const text = noteText.trim().slice(0, 500);
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item: { id: `board_note_${createUuid()}`, kind: "note", ownerActorId: session.viewer.actorId, text, ...placed } } });
    setNoteText("");
    setNoteComposerOpen(false);
    setAddError(null);
  }

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = doodleCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return null;
    return { x: (event.clientX - rect.left) / rect.width * canvas.width, y: (event.clientY - rect.top) / rect.height * canvas.height };
  }

  function beginDoodle(event: PointerEvent<HTMLCanvasElement>) {
    doodlePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (doodlePointersRef.current.size >= 2) {
      const points = [...doodlePointersRef.current.values()];
      const [first, second] = points;
      doodleGestureRef.current = {
        startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        startScale: doodleScale,
        startPan: doodlePan,
        startCenterX: (first.x + second.x) / 2,
        startCenterY: (first.y + second.y) / 2,
      };
      doodlePointerRef.current = null;
      return;
    }
    const point = canvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    doodlePointerRef.current = { pointerId: event.pointerId, ...point };
  }

  function updateDoodle(event: PointerEvent<HTMLCanvasElement>) {
    if (doodlePointersRef.current.has(event.pointerId)) doodlePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (doodlePointersRef.current.size >= 2 && doodleGestureRef.current) {
      const points = [...doodlePointersRef.current.values()];
      const [first, second] = points;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const ratio = distance / doodleGestureRef.current.startDistance;
      const nextScale = clamp(doodleGestureRef.current.startScale * ratio, 0.45, 4);
      const scaleRatio = nextScale / doodleGestureRef.current.startScale;
      setDoodleScale(nextScale);
      setDoodlePan({
        x: centerX - (doodleGestureRef.current.startCenterX - doodleGestureRef.current.startPan.x) * scaleRatio,
        y: centerY - (doodleGestureRef.current.startCenterY - doodleGestureRef.current.startPan.y) * scaleRatio,
      });
      return;
    }
    const point = canvasPoint(event);
    const previous = doodlePointerRef.current;
    const context = doodleCanvasRef.current?.getContext("2d");
    if (!point || !previous || previous.pointerId !== event.pointerId || !context) return;
    context.globalCompositeOperation = doodleTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = doodleTool === "eraser" ? "rgba(0,0,0,1)" : doodleColor;
    context.lineWidth = doodleBrush;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.globalCompositeOperation = "source-over";
    doodlePointerRef.current = { pointerId: event.pointerId, ...point };
  }

  function endDoodle(event: PointerEvent<HTMLCanvasElement>) {
    doodlePointersRef.current.delete(event.pointerId);
    if (doodlePointersRef.current.size < 2) doodleGestureRef.current = null;
    if (doodlePointerRef.current?.pointerId === event.pointerId) doodlePointerRef.current = null;
  }

  function clearDoodle() {
    const canvas = doodleCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f7f3ed";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function addDrawing() {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return;
    const imageDataUrl = canvas.toDataURL("image/png");
    const placed = placement(22);
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item: { id: `board_drawing_${createUuid()}`, kind: "drawing", ownerActorId: session.viewer.actorId, imageDataUrl, ...placed, rotation: 0, width: 22, height: 16 } } });
    setDoodleComposerOpen(false);
    setAddError(null);
  }

  function addLocalPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isImageFile(file)) {
      setAddError("Choose an image file.");
      return;
    }
    if (file.size > MAX_LOCAL_PHOTO_BYTES) {
      setAddError("For local storage, choose an image under 12 MB.");
      return;
    }
    void compressImage(file).then(({ dataUrl, aspectRatio }) => {
      if (!dataUrl.startsWith("data:image/")) {
        setAddError("This image could not be previewed.");
        return;
      }
      const offset = items.length % 6;
      const placed = placement(24);
      dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item: { id: `board_photo_${createUuid()}`, kind: "photo", ownerActorId: session.viewer.actorId, variant: variants[offset % variants.length], imageDataUrl: dataUrl, imageName: file.name, aspectRatio, note: null, ...placed, width: 24 } } });
      setAddError(null);
    }).catch(() => setAddError("This photo format could not be previewed here. Try JPEG, PNG, WebP, or a smaller original."));
  }

  function moveItem(item: BoardItem, dx: number, dy: number) {
    dispatch({ type: "COMMAND", command: { type: "MOVE_BOARD_ITEM", ...commandBase(), itemId: item.id, x: item.x + dx / BOARD_UNIT, y: item.y + dy / BOARD_UNIT } });
  }

  function remove(item: BoardItem) {
    dispatch({ type: "COMMAND", command: { type: "DELETE_BOARD_ITEM", ...commandBase(), itemId: item.id } });
    setSelectedItemId(null);
    if (commentItemId === item.id) setCommentItemId(null);
  }

  function clearBoardEditing() {
    setSelectedItemId(null);
    setCommentItemId(null);
    setBackgroundMenuOpen(false);
    setDragging(null);
    setResizing(null);
  }

  function gestureFromPointers(): GestureState | null {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return null;
    const [first, second] = points;
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    return { startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), startScale: scale, startPan: pan, centerX, centerY };
  }

  function trackPointerStart(event: PointerEvent<HTMLElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      gestureRef.current = gestureFromPointers();
      panRef.current.active = false;
      if (itemPressRef.current?.timeout) window.clearTimeout(itemPressRef.current.timeout);
      itemPressRef.current = null;
      setDragging(null);
      return true;
    }
    return false;
  }

  function trackPointerMove(event: PointerEvent<HTMLElement>) {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size < 2 || !gestureRef.current) return false;
    const points = [...pointersRef.current.values()];
    const [first, second] = points;
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const ratio = distance / gestureRef.current.startDistance;
    const nextScale = Number.isFinite(gestureRef.current.startScale * ratio) ? Math.max(SAFE_MIN_SCALE, gestureRef.current.startScale * ratio) : gestureRef.current.startScale;
    const scaleRatio = nextScale / gestureRef.current.startScale;
    setScale(nextScale);
    setPan({
      x: gestureRef.current.centerX - (gestureRef.current.centerX - gestureRef.current.startPan.x) * scaleRatio,
      y: gestureRef.current.centerY - (gestureRef.current.centerY - gestureRef.current.startPan.y) * scaleRatio,
    });
    return true;
  }

  function trackPointerEnd(event: PointerEvent<HTMLElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    clearBoardEditing();
    if (trackPointerStart(event)) return;
    panRef.current = { active: true, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
  }

  function updatePan(event: PointerEvent<HTMLDivElement>) {
    if (trackPointerMove(event)) return;
    const active = panRef.current;
    if (!active.active || active.pointerId !== event.pointerId) return;
    setPan({ x: active.panX + event.clientX - active.startX, y: active.panY + event.clientY - active.startY });
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    trackPointerEnd(event);
    if (panRef.current.pointerId === event.pointerId) panRef.current.active = false;
  }

  function beginItemPress(event: PointerEvent<HTMLElement>, item: BoardItem) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (trackPointerStart(event)) return;
    const canMove = item.ownerActorId === viewerActorId;
    const press = { itemId: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, timeout: null as number | null, moved: false };
    if (canMove) {
      press.timeout = window.setTimeout(() => {
        if (itemPressRef.current?.itemId !== item.id || itemPressRef.current.moved) return;
        panRef.current.active = false;
        setDragging({ itemId: item.id, dx: 0, dy: 0 });
      }, LONG_PRESS_MS);
    }
    itemPressRef.current = press;
    panRef.current = { active: true, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
  }

  function updateItemPress(event: PointerEvent<HTMLElement>) {
    const press = itemPressRef.current;
    if (trackPointerMove(event)) return;
    if (!press || press.pointerId !== event.pointerId) return;
    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (Math.hypot(dx, dy) > 6) {
      press.moved = true;
      if (press.timeout) {
        window.clearTimeout(press.timeout);
        press.timeout = null;
      }
    }
    if (dragging?.itemId === press.itemId) {
      setDragging({ itemId: press.itemId, dx: dx / scale, dy: dy / scale });
      return;
    }
    const active = panRef.current;
    if (active.active && active.pointerId === event.pointerId) {
      setPan({ x: active.panX + event.clientX - active.startX, y: active.panY + event.clientY - active.startY });
    }
  }

  function endItemPress(event: PointerEvent<HTMLElement>, item: BoardItem) {
    event.stopPropagation();
    trackPointerEnd(event);
    const press = itemPressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (press.timeout) window.clearTimeout(press.timeout);
    const activeDrag = dragging?.itemId === item.id ? dragging : null;
    if (activeDrag) moveItem(item, activeDrag.dx, activeDrag.dy);
    else if (!press.moved) {
      setSelectedItemId(item.id);
      if (item.kind === "photo") openPhotoComments(item.id);
    }
    if (panRef.current.pointerId === event.pointerId) panRef.current.active = false;
    setDragging(null);
    itemPressRef.current = null;
  }

  function itemStyle(item: BoardItem): CSSProperties {
    const activeDrag = dragging?.itemId === item.id ? dragging : null;
    const size = getBoardItemPixelSize(item);
    const activeResize = resizing?.itemId === item.id ? resizing : null;
    return {
      left: `${item.x * BOARD_UNIT}px`,
      top: `${item.y * BOARD_UNIT}px`,
      width: `${activeResize ? activeResize.width * BOARD_UNIT : size.width}px`,
      height: `${activeResize ? activeResize.height * BOARD_UNIT : size.height}px`,
      transform: `translate(${activeDrag?.dx ?? 0}px, ${activeDrag?.dy ?? 0}px) rotate(${clamp(item.rotation, -24, 24)}deg)`,
    };
  }

  function sequencePhotoStyle(item: BoardItem): CSSProperties {
    return item.kind === "photo" ? { aspectRatio: String(getBoardPhotoFrameAspectRatio(item)), height: "auto" } : {};
  }

  function commentsFor(item: BoardItem) {
    return photoComments[item.id] ?? [item.kind === "photo" && item.imageDataUrl ? "New favorite." : "This belongs in the archive.", "Replay this moment."];
  }

  function submitComment(itemId: string, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = commentDrafts[itemId]?.trim();
    if (!value) return;
    setPhotoComments((current) => ({ ...current, [itemId]: [...(current[itemId] ?? []), value.slice(0, 120)] }));
    setCommentDrafts((current) => ({ ...current, [itemId]: "" }));
  }

  function openPhotoComments(itemId: string) {
    setSelectedItemId(itemId);
    setCommentItemId(itemId);
  }

  function activatePhotoFromKeyboard(itemId: string, event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPhotoComments(itemId);
  }

  function beginItemResize(event: PointerEvent<HTMLButtonElement>, item: BoardItem) {
    if ((item.kind !== "note" && item.kind !== "drawing") || item.ownerActorId !== viewerActorId) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const size = getBoardItemPixelSize(item);
    setResizing({ itemId: item.id, startX: event.clientX, startY: event.clientY, startWidth: size.width / BOARD_UNIT, startHeight: size.height / BOARD_UNIT, width: size.width / BOARD_UNIT, height: size.height / BOARD_UNIT });
  }

  function updateItemResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resizing) return;
    event.stopPropagation();
    const width = clamp(resizing.startWidth + (event.clientX - resizing.startX) / scale / BOARD_UNIT, 10, 42);
    const height = clamp(resizing.startHeight + (event.clientY - resizing.startY) / scale / BOARD_UNIT, 6, 34);
    setResizing({ ...resizing, width, height });
  }

  function endItemResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resizing) return;
    event.stopPropagation();
    dispatch({ type: "COMMAND", command: { type: "RESIZE_BOARD_ITEM", ...commandBase(), itemId: resizing.itemId, width: resizing.width, height: resizing.height } });
    setResizing(null);
  }

  function ownerFor(item: BoardItem) {
    return members.find((member) => member.actorId === item.ownerActorId) ?? null;
  }

  function photoCommentOverlay(item: BoardItem) {
    if (item.kind !== "photo" || commentItemId !== item.id) return null;
    return (
      <div className={styles.photoComments} onClick={(event) => event.stopPropagation()}>
        <div className={styles.commentBarrage} aria-hidden="true">
          {commentsFor(item).map((comment, index) => <span key={`${comment}-${index}`} style={{ animationDelay: `${index * 850}ms`, top: `${18 + index % 3 * 22}%` }}>{comment}</span>)}
        </div>
        <input value={commentDrafts[item.id] ?? ""} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.id]: event.target.value.slice(0, 120) }))} onKeyDown={(event) => submitComment(item.id, event)} placeholder="Write a comment..." aria-label="Write a photo comment" />
      </div>
    );
  }

  return (
    <div className={`${styles.boardPanel} ${styles[`boardBg${background[0].toUpperCase()}${background.slice(1)}`]}`}>
      {sequence ? (
        <div className={styles.sequence}>
          {items.map((item) => item.kind === "photo" ? <article key={item.id} className={styles.sequencePhoto}><div className={styles.sequencePhotoFrame} style={sequencePhotoStyle(item)}><PinnedPhoto variant={item.variant} note={item.imageDataUrl ? null : item.note} imageDataUrl={item.imageDataUrl} imageName={item.imageName} className={styles.sequencePinnedPhoto} />{commentItemId === item.id ? <div className={styles.photoAuthor}><b>{ownerFor(item)?.initials ?? "?"}</b><span>{ownerFor(item)?.displayName ?? "Member"}</span></div> : null}<button type="button" className={styles.photoCommentHotspot} aria-label="Show photo comments" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openPhotoComments(item.id); }} />{photoCommentOverlay(item)}</div></article> : item.kind === "drawing" ? <article key={item.id} className={styles.sequenceDrawing}><button type="button" className={styles.sequenceItem} onClick={() => setSelectedItemId(item.id)}><NextImage src={item.imageDataUrl} alt="Board drawing" width={640} height={480} unoptimized /></button></article> : <article key={item.id} className={styles.sequenceNote}><button type="button" className={styles.sequenceItem} onClick={() => setSelectedItemId(item.id)}><p>{item.text}</p></button></article>)}
        </div>
      ) : (
        <div ref={viewportRef} className={styles.canvasViewport} onPointerDown={beginPan} onPointerMove={updatePan} onPointerUp={endPan} onPointerCancel={endPan}>
          <div className={styles.canvasWorld} style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}>
            {items.map((item) => item.kind === "photo" ? (
              <div role="button" tabIndex={0} className={`${styles.positionedPhoto} ${dragging?.itemId === item.id ? styles.boardDragging : ""}`} key={item.id} onKeyDown={(event) => activatePhotoFromKeyboard(item.id, event)} onPointerDown={(event) => beginItemPress(event, item)} onPointerMove={updateItemPress} onPointerUp={(event) => endItemPress(event, item)} onPointerCancel={(event) => endItemPress(event, item)} onContextMenu={(event) => event.preventDefault()} style={itemStyle(item)}>
                <PinnedPhoto variant={item.variant} note={item.imageDataUrl ? null : item.note} imageDataUrl={item.imageDataUrl} imageName={item.imageName} className={styles.canvasPhoto} />
                {commentItemId === item.id ? <div className={styles.photoAuthor}><b>{ownerFor(item)?.initials ?? "?"}</b><span>{ownerFor(item)?.displayName ?? "Member"}</span></div> : null}
                {photoCommentOverlay(item)}
              </div>
            ) : item.kind === "drawing" ? (
              <div role="button" tabIndex={0} key={item.id} className={`${styles.canvasDrawing} ${selectedItemId === item.id ? styles.noteSelected : ""} ${dragging?.itemId === item.id ? styles.boardDragging : ""}`} onPointerDown={(event) => beginItemPress(event, item)} onPointerMove={updateItemPress} onPointerUp={(event) => endItemPress(event, item)} onPointerCancel={(event) => endItemPress(event, item)} onContextMenu={(event) => event.preventDefault()} style={itemStyle(item)}>
                <NextImage src={item.imageDataUrl} alt="Board drawing" fill sizes="260px" unoptimized />
                {selectedItemId === item.id && item.ownerActorId === viewerActorId ? <button type="button" className={styles.noteResizeHandle} aria-label="Resize drawing" onPointerDown={(event) => beginItemResize(event, item)} onPointerMove={updateItemResize} onPointerUp={endItemResize} onPointerCancel={endItemResize} /> : null}
              </div>
            ) : (
              <div role="button" tabIndex={0} key={item.id} className={`${styles.canvasNote} ${selectedItemId === item.id ? styles.noteSelected : ""} ${dragging?.itemId === item.id ? styles.boardDragging : ""}`} onPointerDown={(event) => beginItemPress(event, item)} onPointerMove={updateItemPress} onPointerUp={(event) => endItemPress(event, item)} onPointerCancel={(event) => endItemPress(event, item)} onContextMenu={(event) => event.preventDefault()} style={itemStyle(item)}><span>{item.text}</span>{selectedItemId === item.id && item.ownerActorId === viewerActorId ? <button type="button" className={styles.noteResizeHandle} aria-label="Resize text note" onPointerDown={(event) => beginItemResize(event, item)} onPointerMove={updateItemResize} onPointerUp={endItemResize} onPointerCancel={endItemResize} /> : null}</div>
            ))}
          </div>
          {items.length === 0 ? <div className={styles.boardHint}>Pin the first photo or note.</div> : null}
        </div>
      )}
      <input ref={cameraInputRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" onChange={addLocalPhoto} />
      <input ref={albumInputRef} className={styles.fileInput} type="file" accept="image/*" onChange={addLocalPhoto} />
      {canDeleteSelected && selectedItem ? <button type="button" className={styles.deleteBoardAction} aria-label="Delete selected board item" onClick={() => remove(selectedItem)}><Icon name="minus" /></button> : null}
      <div className={styles.boardActions}><button type="button" aria-label="Return to board overview" onClick={() => { setSequence(false); setCommentItemId(null); setSelectedItemId(null); window.requestAnimationFrame(fitBoardToItems); }}><Icon name="home" /></button><button type="button" aria-label="Choose canvas background" aria-expanded={backgroundMenuOpen} onClick={() => setBackgroundMenuOpen((open) => !open)}><Icon name="grid" /></button>{canAdd ? <><button type="button" className={styles.addBoard} aria-label="Open camera" disabled={photoCount >= maxPhotos} onClick={() => cameraInputRef.current?.click()}><Icon name="camera" /></button><button type="button" className={styles.addBoard} aria-label="Choose from photo library" disabled={photoCount >= maxPhotos} onClick={() => albumInputRef.current?.click()}><Icon name="image" /></button><button type="button" className={styles.addBoard} aria-label="Add text note" onClick={() => { setNoteComposerOpen(true); setAddError(null); }}><Icon name="text" /></button><button type="button" className={styles.addBoard} aria-label="Draw on a card" onClick={() => { setDoodleComposerOpen(true); setAddError(null); }}><Icon name="draw" /></button></> : null}</div>
      {backgroundMenuOpen ? <div className={styles.backgroundPicker} aria-label="Canvas backgrounds">{(["stone","linen","charcoal"] as const).map((item) => <button type="button" key={item} className={`${styles.backgroundSwatch} ${styles[`backgroundSwatch${item[0].toUpperCase()}${item.slice(1)}`]} ${background === item ? styles.backgroundSwatchSelected : ""}`} onClick={() => { setBackground(item); setBackgroundMenuOpen(false); }}><span>{item}</span></button>)}</div> : null}
      {noteComposerOpen ? <div className={styles.noteComposerOverlay} role="dialog" aria-modal="true" aria-label="Add text to board" onClick={() => setNoteComposerOpen(false)}><article onClick={(event) => event.stopPropagation()}><header><div><p>Text</p><strong>Preview your note.</strong></div><button type="button" aria-label="Close text note composer" onClick={() => setNoteComposerOpen(false)}><Icon name="close" /></button></header><div className={styles.noteStyleRail}><div className={styles.notePreview}>{noteText.trim() || "Write something for the board."}</div></div><label>Text <span>{noteText.length} / 500</span></label><textarea value={noteText} onChange={(event) => setNoteText(event.target.value.slice(0,500))} placeholder="Leave something on the board..." rows={4} /><button type="button" className={styles.addNote} disabled={!noteText.trim()} onClick={addNote}>Pin this text <Icon name="arrow" /></button>{addError ? <p className={styles.addError}>{addError}</p> : null}</article></div> : null}
      {doodleComposerOpen ? <div className={styles.doodleOverlay} role="dialog" aria-modal="true" aria-label="Draw on a board card"><div className={styles.doodleStage}><canvas ref={doodleCanvasRef} width={640} height={480} className={styles.doodleCanvas} style={{ transform: `translate3d(${doodlePan.x}px, ${doodlePan.y}px, 0) scale(${doodleScale})` }} onPointerDown={beginDoodle} onPointerMove={updateDoodle} onPointerUp={endDoodle} onPointerCancel={endDoodle} />{brushPreviewVisible ? <div className={styles.brushPreview} style={{ width: `${doodleBrush * 2.8}px`, height: `${doodleBrush * 2.8}px`, borderColor: doodleTool === "eraser" ? "#171613" : doodleColor, background: doodleTool === "eraser" ? "rgba(245,241,234,.72)" : doodleColor }} /> : null}</div><div className={styles.doodleTools}><div className={styles.doodleColors}>{drawingColors.map((color) => <button type="button" key={color} className={doodleColor === color && doodleTool === "brush" ? styles.doodleColorSelected : ""} style={{ background: color }} aria-label={`Use color ${color}`} onClick={() => { setDoodleColor(color); setDoodleTool("brush"); }} />)}</div><button type="button" className={doodleTool === "eraser" ? styles.doodleToolSelected : ""} aria-label="Use eraser" onClick={() => setDoodleTool("eraser")}>Erase</button><label>Brush <input type="range" min={2} max={22} value={doodleBrush} onPointerDown={() => setBrushPreviewVisible(true)} onPointerUp={() => setBrushPreviewVisible(false)} onPointerCancel={() => setBrushPreviewVisible(false)} onBlur={() => setBrushPreviewVisible(false)} onChange={(event) => { setBrushPreviewVisible(true); setDoodleBrush(Number(event.target.value)); }} /></label><button type="button" aria-label="Close drawing board" onClick={() => setDoodleComposerOpen(false)}><Icon name="close" /></button><button type="button" onClick={clearDoodle}>Clear</button><button type="button" className={styles.doodleConfirm} onClick={addDrawing}>Add <Icon name="arrow" /></button>{addError ? <p className={styles.addError}>{addError}</p> : null}</div></div> : null}
    </div>
  );
}
