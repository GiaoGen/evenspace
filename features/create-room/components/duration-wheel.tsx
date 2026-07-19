"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./create-room-wizard.module.css";

const REPEAT_COUNT = 9;
const CENTER_SEGMENT = Math.floor(REPEAT_COUNT / 2);

export function DurationWheel({ label, values, selected, format, disabled, onSelect }: { readonly label: string; readonly values: readonly number[]; readonly selected: number; readonly format: (value: number) => string; readonly disabled?: (value: number) => boolean; readonly onSelect: (value: number) => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const settleRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const repeatedValues = useMemo(() => Array.from({ length: REPEAT_COUNT }, (_, segment) => values.map((value, index) => ({ value, index, segment, wheelIndex: segment * values.length + index }))).flat(), [values]);
  const selectedIndex = values.indexOf(selected);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || selectedIndex < 0 || initializedRef.current) return;
    initializedRef.current = true;
    scroller.querySelector<HTMLButtonElement>(`button[data-wheel-index="${CENTER_SEGMENT * values.length + selectedIndex}"]`)?.scrollIntoView({ block: "center" });
  }, [selectedIndex, values.length]);

  useEffect(() => () => {
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
  }, []);

  function settleOnCenter() {
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const center = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
      let closest: HTMLButtonElement | null = null;
      let distance = Number.POSITIVE_INFINITY;
      scroller.querySelectorAll<HTMLButtonElement>("button[data-wheel-index]:not(:disabled)").forEach((button) => {
        const rect = button.getBoundingClientRect();
        const nextDistance = Math.abs(rect.top + rect.height / 2 - center);
        if (nextDistance < distance) { closest = button; distance = nextDistance; }
      });
      if (!closest) return;
      const button = closest as HTMLButtonElement;
      const value = Number(button.dataset.value);
      const index = Number(button.dataset.index);
      const segment = Number(button.dataset.segment);
      if (Number.isFinite(value) && value !== selected) onSelect(value);
      if (Number.isFinite(index) && Number.isFinite(segment) && segment !== CENTER_SEGMENT) {
        scroller.querySelector<HTMLButtonElement>(`button[data-wheel-index="${CENTER_SEGMENT * values.length + index}"]`)?.scrollIntoView({ block: "center" });
      }
    }, 80);
  }

  function choose(value: number, wheelIndex: number) {
    onSelect(value);
    scrollerRef.current?.querySelector<HTMLButtonElement>(`button[data-wheel-index="${wheelIndex}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return <div className={styles.wheelColumn}>
    <span>{label}</span>
    <div className={styles.durationWheelShell}>
      <div ref={scrollerRef} className={styles.durationWheel} onScroll={settleOnCenter}>
        {repeatedValues.map((item) => <button type="button" key={item.wheelIndex} data-value={item.value} data-index={item.index} data-segment={item.segment} data-wheel-index={item.wheelIndex} className={selected === item.value ? styles.durationWheelActive : ""} disabled={disabled?.(item.value)} onClick={() => choose(item.value, item.wheelIndex)}>{format(item.value)}</button>)}
      </div>
      <i className={styles.wheelSelection} aria-hidden="true" />
    </div>
  </div>;
}
