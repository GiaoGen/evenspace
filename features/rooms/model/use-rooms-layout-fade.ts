"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

import { rememberRoomCarouselItem } from "./use-room-carousel";

export const ROOMS_LAYOUT_FADE_OUT_MS = 110;
export const ROOMS_LAYOUT_FADE_IN_MS = 170;

type LayoutFadePhase = "idle" | "out" | "in";

function nearestRoomKey(container: HTMLElement, vertical: boolean) {
  const containerRect = container.getBoundingClientRect();
  const target = vertical
    ? containerRect.top + container.clientHeight / 2
    : containerRect.left + container.clientWidth / 2;
  let nearestKey: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  Array.from(container.querySelectorAll<HTMLElement>("[data-room-card]")).forEach((card) => {
    const roomKey = card.dataset.roomKey;
    if (!roomKey) return;
    const rect = card.getBoundingClientRect();
    const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    const distance = Math.abs(center - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestKey = roomKey;
    }
  });

  return nearestKey;
}

function alignGridRoom(container: HTMLElement, roomKey: string) {
  const card = Array.from(container.querySelectorAll<HTMLElement>("[data-room-card]"))
    .find((candidate) => candidate.dataset.roomKey === roomKey);
  if (!card) return;
  const containerRect = container.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const target = container.scrollTop + cardRect.top - containerRect.top - (container.clientHeight - cardRect.height) / 2;
  container.scrollTop = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, target));
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useRoomsLayoutFade({
  containerRef,
  grid,
  activeRoomKey,
  setGrid,
}: {
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly grid: boolean;
  readonly activeRoomKey?: string;
  readonly setGrid: (grid: boolean) => void;
}) {
  const [phase, setPhase] = useState<LayoutFadePhase>("idle");
  const targetGridRef = useRef<boolean | null>(null);
  const anchorRoomKeyRef = useRef<string | null>(null);

  const toggleLayout = useCallback(() => {
    if (phase !== "idle") return;
    const nextGrid = !grid;
    const container = containerRef.current;
    const anchorRoomKey = nextGrid
      ? activeRoomKey ?? (container ? nearestRoomKey(container, false) : null)
      : (container ? nearestRoomKey(container, true) : null) ?? activeRoomKey ?? null;

    if (anchorRoomKey) rememberRoomCarouselItem(anchorRoomKey);
    if (!container || reducedMotion()) {
      setGrid(nextGrid);
      return;
    }

    targetGridRef.current = nextGrid;
    anchorRoomKeyRef.current = anchorRoomKey;
    setPhase("out");
  }, [activeRoomKey, containerRef, grid, phase, setGrid]);

  useEffect(() => {
    if (phase === "idle") return;
    const duration = phase === "out" ? ROOMS_LAYOUT_FADE_OUT_MS : ROOMS_LAYOUT_FADE_IN_MS;
    const timer = window.setTimeout(() => {
      if (phase === "out") {
        const targetGrid = targetGridRef.current;
        if (targetGrid !== null) setGrid(targetGrid);
        setPhase("in");
        return;
      }
      targetGridRef.current = null;
      anchorRoomKeyRef.current = null;
      setPhase("idle");
    }, duration);
    return () => window.clearTimeout(timer);
  }, [phase, setGrid]);

  useLayoutEffect(() => {
    if (phase !== "in" || !grid) return;
    const container = containerRef.current;
    const anchorRoomKey = anchorRoomKeyRef.current;
    if (container && anchorRoomKey) alignGridRoom(container, anchorRoomKey);
  }, [containerRef, grid, phase]);

  return {
    isTransitioning: phase !== "idle",
    phase,
    toggleLayout,
  };
}
