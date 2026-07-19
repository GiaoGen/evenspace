"use client";

import { useEffect, useRef, type UIEvent } from "react";

export function useCenteredCardSelection<T extends string>(value: T, onChange: (value: T) => void) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function syncToCenter(element: HTMLDivElement) {
    const railCenter = element.getBoundingClientRect().left + element.clientWidth / 2;
    let closestValue: string | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    element.querySelectorAll<HTMLElement>("[data-carousel-value]").forEach((card) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
      if (distance < closestDistance) { closestValue = card.dataset.carouselValue; closestDistance = distance; }
    });
    const nextValue = closestValue as T | undefined;
    if (nextValue && nextValue !== value) onChange(nextValue);
  }

  function onScroll(event: UIEvent<HTMLDivElement>) {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    const element = event.currentTarget;
    frameRef.current = window.requestAnimationFrame(() => syncToCenter(element));
  }

  function select(nextValue: T) {
    onChange(nextValue);
    const card = [...(railRef.current?.querySelectorAll<HTMLElement>("[data-carousel-value]") ?? [])]
      .find((item) => item.dataset.carouselValue === nextValue);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return { railRef, onScroll, select };
}
