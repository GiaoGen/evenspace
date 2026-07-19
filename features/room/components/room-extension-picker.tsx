"use client";

import { formatExtensionDuration, getExtendedEndsAt, ROOM_EXTENSION_STEP_MINUTES } from "../model/room-extension";
import styles from "./room-extension-picker.module.css";

const quickDurations = [30, 60, 120, 240] as const;

export function RoomExtensionPicker({ mode, minutes, maxMinutes, endsAt, nowIso, onChange, onCancel, onConfirm }: { readonly mode: "direct" | "vote"; readonly minutes: number; readonly maxMinutes: number; readonly endsAt: string | null; readonly nowIso: string; readonly onChange: (minutes: number) => void; readonly onCancel: () => void; readonly onConfirm: () => void }) {
  const disabled = maxMinutes < ROOM_EXTENSION_STEP_MINUTES;
  const newEnd = disabled ? null : getExtendedEndsAt(endsAt, nowIso, minutes);
  const endLabel = newEnd ? new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(newEnd)) : "24-hour limit reached";

  return <section className={styles.extensionPicker} aria-label={mode === "direct" ? "Choose extension duration" : "Choose proposed extension duration"}>
    <header><span>{mode === "direct" ? "Extend by" : "Propose"}</span><strong>+ {disabled ? "0 min" : formatExtensionDuration(minutes)}</strong></header>
    <input type="range" min={ROOM_EXTENSION_STEP_MINUTES} max={Math.max(ROOM_EXTENSION_STEP_MINUTES, maxMinutes)} step={ROOM_EXTENSION_STEP_MINUTES} value={Math.min(Math.max(ROOM_EXTENSION_STEP_MINUTES, minutes), Math.max(ROOM_EXTENSION_STEP_MINUTES, maxMinutes))} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-label="Extension duration in minutes" />
    <div className={styles.extensionQuick}>{quickDurations.filter((value) => value <= maxMinutes).map((value) => <button type="button" key={value} className={minutes === value ? styles.extensionQuickActive : ""} onClick={() => onChange(value)}>{value < 60 ? `${value}m` : `${value / 60}h`}</button>)}</div>
    <p><span>New ending time</span><strong>{endLabel}</strong></p>
    <footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" className={styles.confirm} disabled={disabled} onClick={onConfirm}>{mode === "direct" ? "Extend room" : "Create vote"}</button></footer>
  </section>;
}
