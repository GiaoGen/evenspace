"use client";

import { useRef, type PointerEvent, type MouseEvent } from "react";
import type { PersonSummary } from "@/core/domain/room";
import type { MemoirPage } from "./memoir-model";
import { MemoirPageView } from "./memoir-page";
import styles from "./memoir.module.css";

const HOLD_DELAY_MS = 480;
const MOVE_TOLERANCE_PX = 10;

export function EditableMemoirPage({ page, members, side, spreadId, onEdit, onOpenPhoto }: {
  readonly page: MemoirPage;
  readonly members: readonly PersonSummary[];
  readonly side: "left" | "right";
  readonly spreadId: string;
  readonly onEdit: (spreadId: string, pageNumber: number) => void;
  readonly onOpenPhoto: (photoId: string) => void;
}) {
  const gestureRef = useRef<{ timer: number; x: number; y: number; pointerId: number; target: HTMLDivElement } | null>(null);
  const heldRef = useRef(false);

  function clearGesture() {
    if (gestureRef.current) window.clearTimeout(gestureRef.current.timer);
    gestureRef.current = null;
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    heldRef.current = false;
    const timer = window.setTimeout(() => {
      heldRef.current = true;
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (gesture?.target.hasPointerCapture(gesture.pointerId)) gesture.target.releasePointerCapture(gesture.pointerId);
      navigator.vibrate?.(12);
      window.requestAnimationFrame(() => onEdit(spreadId, page.pageNumber));
    }, HOLD_DELAY_MS);
    gestureRef.current = { timer, x: event.clientX, y: event.clientY, pointerId: event.pointerId, target: event.currentTarget };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > MOVE_TOLERANCE_PX) clearGesture();
  }

  function suppressHeldClick(event: MouseEvent<HTMLDivElement>) {
    if (!heldRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    heldRef.current = false;
  }

  return <div className={styles.pageShell} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={clearGesture} onPointerCancel={clearGesture} onPointerLeave={clearGesture} onClickCapture={suppressHeldClick}>
    <MemoirPageView page={page} members={members} side={side} onOpenPhoto={onOpenPhoto} />
  </div>;
}
