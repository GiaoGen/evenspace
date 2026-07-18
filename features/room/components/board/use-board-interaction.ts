"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { BOARD_UNIT, computeBoardFit } from "@/core/domain/board-layout";
import type { ActorId } from "@/core/domain/ids";
import type { BoardItem } from "@/core/domain/room";

const LONG_PRESS_MS = 360;
const MIN_SCALE = 0.001;

export type BoardPan = { readonly x: number; readonly y: number };
export type BoardDrag = { readonly itemId: string; readonly dx: number; readonly dy: number };

type Point = { readonly x: number; readonly y: number };
type Pinch = { readonly distance: number; readonly scale: number; readonly pan: BoardPan; readonly center: Point };
type Press = { readonly itemId: string; readonly pointerId: number; readonly start: Point; timer: number | null; moved: boolean };

interface UseBoardInteractionOptions {
  readonly items: readonly BoardItem[];
  readonly viewerActorId: ActorId;
  readonly onSelect: (item: BoardItem) => void;
  readonly onClear: () => void;
  readonly onMove: (item: BoardItem, dx: number, dy: number) => void;
}

export function useBoardInteraction({ items, viewerActorId, onSelect, onClear, onMove }: UseBoardInteractionOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<Pinch | null>(null);
  const panGestureRef = useRef<{ active: boolean; pointerId: number; start: Point; pan: BoardPan }>({ active: false, pointerId: -1, start: { x: 0, y: 0 }, pan: { x: 0, y: 0 } });
  const pressRef = useRef<Press | null>(null);
  const fittedRef = useRef(false);
  const [pan, setPan] = useState<BoardPan>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<BoardDrag | null>(null);

  const fit = useCallback((animate = true) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0 || items.length === 0) {
      setPan({ x: 0, y: 0 });
      setScale(1);
      return;
    }
    const next = computeBoardFit(items, rect);
    if (animate) viewportRef.current?.classList.add("is-fitting");
    setScale(next.scale);
    setPan({ x: next.x, y: next.y });
    if (animate) window.setTimeout(() => viewportRef.current?.classList.remove("is-fitting"), 360);
  }, [items]);

  useEffect(() => {
    if (fittedRef.current) return;
    fittedRef.current = true;
    const frame = window.requestAnimationFrame(() => fit(false));
    return () => window.cancelAnimationFrame(frame);
  }, [fit]);

  useEffect(() => () => {
    if (pressRef.current?.timer) window.clearTimeout(pressRef.current.timer);
  }, []);

  function startPointer(event: PointerEvent<HTMLElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size < 2) return false;
    const [first, second] = [...pointersRef.current.values()];
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    pinchRef.current = { distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), scale, pan, center };
    panGestureRef.current.active = false;
    if (pressRef.current?.timer) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
    setDrag(null);
    return true;
  }

  function movePointer(event: PointerEvent<HTMLElement>) {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pinch = pinchRef.current;
    if (pointersRef.current.size < 2 || !pinch) return false;
    const [first, second] = [...pointersRef.current.values()];
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const nextScale = Math.max(MIN_SCALE, pinch.scale * distance / pinch.distance);
    const ratio = nextScale / pinch.scale;
    setScale(nextScale);
    setPan({
      x: center.x - (pinch.center.x - pinch.pan.x) * ratio,
      y: center.y - (pinch.center.y - pinch.pan.y) * ratio,
    });
    return true;
  }

  function endPointer(event: PointerEvent<HTMLElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  function beginCanvas(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    onClear();
    if (startPointer(event)) return;
    panGestureRef.current = { active: true, pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, pan };
  }

  function moveCanvas(event: PointerEvent<HTMLDivElement>) {
    if (movePointer(event)) return;
    const gesture = panGestureRef.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId) return;
    setPan({ x: gesture.pan.x + event.clientX - gesture.start.x, y: gesture.pan.y + event.clientY - gesture.start.y });
  }

  function endCanvas(event: PointerEvent<HTMLDivElement>) {
    endPointer(event);
    if (panGestureRef.current.pointerId === event.pointerId) panGestureRef.current.active = false;
  }

  function beginItem(event: PointerEvent<HTMLElement>, item: BoardItem) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (startPointer(event)) return;
    const press: Press = { itemId: item.id, pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, timer: null, moved: false };
    if (item.ownerActorId === viewerActorId) press.timer = window.setTimeout(() => {
      if (pressRef.current?.itemId !== item.id || pressRef.current.moved) return;
      panGestureRef.current.active = false;
      setDrag({ itemId: item.id, dx: 0, dy: 0 });
      navigator.vibrate?.(8);
    }, LONG_PRESS_MS);
    pressRef.current = press;
    panGestureRef.current = { active: true, pointerId: event.pointerId, start: press.start, pan };
  }

  function moveItem(event: PointerEvent<HTMLElement>) {
    if (movePointer(event)) return;
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    const screenDx = event.clientX - press.start.x;
    const screenDy = event.clientY - press.start.y;
    if (Math.hypot(screenDx, screenDy) > 6 && !drag) {
      press.moved = true;
      if (press.timer) window.clearTimeout(press.timer);
      press.timer = null;
    }
    if (drag?.itemId === press.itemId) {
      setDrag({ itemId: press.itemId, dx: screenDx / scale, dy: screenDy / scale });
      return;
    }
    const gesture = panGestureRef.current;
    if (gesture.active && gesture.pointerId === event.pointerId) setPan({ x: gesture.pan.x + screenDx, y: gesture.pan.y + screenDy });
  }

  function endItem(event: PointerEvent<HTMLElement>, item: BoardItem) {
    event.stopPropagation();
    endPointer(event);
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (press.timer) window.clearTimeout(press.timer);
    if (drag?.itemId === item.id) onMove(item, drag.dx / BOARD_UNIT, drag.dy / BOARD_UNIT);
    else if (!press.moved) onSelect(item);
    if (panGestureRef.current.pointerId === event.pointerId) panGestureRef.current.active = false;
    setDrag(null);
    pressRef.current = null;
  }

  return {
    viewportRef: viewportRef as RefObject<HTMLDivElement | null>,
    pan,
    scale,
    drag,
    fit,
    canvasHandlers: { onPointerDown: beginCanvas, onPointerMove: moveCanvas, onPointerUp: endCanvas, onPointerCancel: endCanvas },
    itemHandlers: { onPointerDown: beginItem, onPointerMove: moveItem, onPointerUp: endItem, onPointerCancel: endItem },
  };
}
