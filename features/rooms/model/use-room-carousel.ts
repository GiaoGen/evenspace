"use client";

import { useEffect, useRef, useState } from "react";

export function useRoomCarousel(itemKeys: readonly string[], enabled: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

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
    }

    function scheduleUpdate() {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    }

    container.scrollTo({ left: 0, behavior: "auto" });
    scheduleUpdate();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      container.removeEventListener("scroll", scheduleUpdate);
      observer.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, itemKeys]);

  return { containerRef, activeIndex: Math.min(activeIndex, Math.max(0, itemKeys.length - 1)), progress };
}
