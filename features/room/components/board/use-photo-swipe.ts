"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type PhotoNavigationDirection = -1 | 1;

interface PhotoSwipeOptions {
  readonly canGoPrevious: boolean;
  readonly canGoNext: boolean;
  readonly onNavigate: (direction: PhotoNavigationDirection) => void;
}

interface PointerGesture {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startedAt: number;
  horizontal: boolean;
}

export function usePhotoSwipe({ canGoPrevious, canGoNext, onNavigate }: PhotoSwipeOptions) {
  const gestureRef = useRef<PointerGesture | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    gestureRef.current = null;
    setDragging(false);
    setDragOffset(0);
  }, []);

  const navigate = useCallback((direction: PhotoNavigationDirection) => {
    const allowed = direction === -1 ? canGoPrevious : canGoNext;
    if (!allowed) return;
    reset();
    onNavigate(direction);
  }, [canGoNext, canGoPrevious, onNavigate, reset]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.pointerType === "mouse" && event.button !== 0) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      horizontal: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.horizontal) {
      if (Math.abs(deltaX) < 9 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.1) return;
      gesture.horizontal = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const atBoundary = (deltaX > 0 && !canGoPrevious) || (deltaX < 0 && !canGoNext);
    setDragOffset(atBoundary ? deltaX * 0.18 : deltaX);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const elapsed = Math.max(performance.now() - gesture.startedAt, 1);
    const threshold = Math.min(96, Math.max(48, event.currentTarget.clientWidth * 0.16));
    const shouldNavigate = gesture.horizontal && (Math.abs(deltaX) >= threshold || Math.abs(deltaX) / elapsed >= 0.55);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (shouldNavigate) navigate(deltaX < 0 ? 1 : -1);
    else reset();
  }

  const style = {
    "--photo-drag-x": `${dragOffset}px`,
    transition: dragging ? "none" : undefined,
  } as CSSProperties;

  return {
    navigate,
    mediaProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
    },
    photoStyle: style,
  };
}
