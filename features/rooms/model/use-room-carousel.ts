"use client";

import { useLayoutEffect, useRef, useState } from "react";

const ACTIVE_ROOM_STORAGE_KEY = "eventspace:rooms:active-room";

export function rememberRoomCarouselItem(itemKey: string) {
  try { window.sessionStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, itemKey); }
  catch { /* Storage is optional; the carousel still works without restoration. */ }
}

function getRememberedRoom() {
  try { return window.sessionStorage.getItem(ACTIVE_ROOM_STORAGE_KEY); }
  catch { return null; }
}

export function useRoomCarousel(itemKeys: readonly string[], enabled: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const alignmentFrameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;
    const carousel = container;

    function update() {
      frameRef.current = null;
      const maxScroll = Math.max(0, container!.scrollWidth - container!.clientWidth);
      setProgress(maxScroll > 0 ? Math.min(1, Math.max(0, container!.scrollLeft / maxScroll)) : 0);
      const center = container!.getBoundingClientRect().left + container!.clientWidth / 2;
      const cards = Array.from(container!.querySelectorAll<HTMLElement>("[data-room-card]"));
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const nextDistance = Math.abs(rect.left + rect.width / 2 - center);
        if (nextDistance < distance) { distance = nextDistance; nearest = index; }
      });
      setActiveIndex(nearest);
      const activeKey = itemKeys[nearest];
      if (activeKey) rememberRoomCarouselItem(activeKey);
    }

    function scheduleUpdate() {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    }

    const rememberedIndex = Math.max(0, itemKeys.indexOf(getRememberedRoom() ?? ""));
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-room-card]"));
    const rememberedCard = cards[rememberedIndex] ?? cards[0];

    function alignRememberedCard() {
      if (!rememberedCard) return;
      const containerRect = carousel.getBoundingClientRect();
      const cardRect = rememberedCard.getBoundingClientRect();
      const centeredLeft = carousel.scrollLeft + cardRect.left + cardRect.width / 2 - (containerRect.left + carousel.clientWidth / 2);
      carousel.scrollLeft = Math.max(0, Math.min(carousel.scrollWidth - carousel.clientWidth, centeredLeft));
    }

    container.style.scrollSnapType = "none";
    alignRememberedCard();
    alignmentFrameRef.current = window.requestAnimationFrame(() => {
      alignRememberedCard();
      container.style.removeProperty("scroll-snap-type");
      alignmentFrameRef.current = null;
      scheduleUpdate();
    });
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      container.removeEventListener("scroll", scheduleUpdate);
      observer.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (alignmentFrameRef.current !== null) window.cancelAnimationFrame(alignmentFrameRef.current);
      container.style.removeProperty("scroll-snap-type");
    };
  }, [enabled, itemKeys]);

  return { containerRef, activeIndex: Math.min(activeIndex, Math.max(0, itemKeys.length - 1)), progress };
}
