"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageFlip } from "page-flip";

interface BookPageFlipOptions {
  readonly contentKey: string;
  readonly onPageChange: (pageIndex: number) => void;
}

export function useBookPageFlip({ contentKey, onPageChange }: BookPageFlipOptions) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<PageFlip | null>(null);
  const animatingRef = useRef(false);
  const onPageChangeRef = useRef(onPageChange);
  const [ready, setReady] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const update = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance || animatingRef.current) return;
    instance.update();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const stage = stageRef.current;
    if (!mount || !stage) return;

    setReady(false);
    setPageCount(0);

    let active = true;
    let instance: PageFlip | null = null;
    let resizeFrame: number | null = null;
    let revealFrame: number | null = null;
    let observer: ResizeObserver | null = null;

    const scheduleUpdate = () => {
      if (!active || !instance || animatingRef.current) return;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (active && instance && mount.isConnected) instance.update();
      });
    };

    const initialise = async () => {
      await globalThis.document.fonts.ready;
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (!active || !mount.isConnected || stage.clientWidth === 0 || stage.clientHeight === 0) return;

      const { PageFlip: PageFlipConstructor } = await import("page-flip");
      if (!active || !mount.isConnected) return;

      instance = new PageFlipConstructor(mount, {
        width: 360,
        height: 480,
        size: "stretch",
        minWidth: 120,
        maxWidth: 520,
        minHeight: 160,
        maxHeight: 694,
        drawShadow: true,
        flippingTime: 820,
        usePortrait: false,
        autoSize: true,
        maxShadowOpacity: 0.2,
        showCover: true,
        mobileScrollSupport: true,
        clickEventForward: true,
        useMouseEvents: true,
        swipeDistance: 42,
        showPageCorners: false,
        disableFlipByClick: true,
      });

      instance.on<{ readonly page: number }>("init", ({ data }) => {
        if (!active || !instance) return;
        instanceRef.current = instance;
        setPageCount(instance.getPageCount());
        onPageChangeRef.current(data.page);
        instance.update();
        revealFrame = window.requestAnimationFrame(() => {
          if (!active || !instance) return;
          instance.update();
          revealFrame = window.requestAnimationFrame(() => {
            if (active) setReady(true);
          });
        });
      });
      instance.on<number>("flip", ({ data }) => {
        if (active) onPageChangeRef.current(data);
      });
      instance.on<string>("changeState", ({ data }) => {
        animatingRef.current = data !== "read";
      });
      instance.loadFromHTML(Array.from(mount.querySelectorAll<HTMLElement>("[data-book-page]")));

      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(stage);
      window.visualViewport?.addEventListener("resize", scheduleUpdate);
    };

    void initialise();
    return () => {
      active = false;
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      if (revealFrame !== null) window.cancelAnimationFrame(revealFrame);
      animatingRef.current = false;
      instanceRef.current = null;
      instance?.destroy();
    };
  }, [contentKey]);

  const flipNext = useCallback(() => {
    if (animatingRef.current) return false;
    const instance = instanceRef.current;
    if (!instance || instance.getCurrentPageIndex() >= instance.getPageCount() - 1) return false;
    instance.flipNext("bottom");
    return true;
  }, []);

  const flipPrevious = useCallback(() => {
    if (animatingRef.current) return false;
    const instance = instanceRef.current;
    if (!instance || instance.getCurrentPageIndex() <= 0) return false;
    instance.flipPrev("bottom");
    return true;
  }, []);

  return { stageRef, mountRef, ready, pageCount, update, flipNext, flipPrevious };
}
