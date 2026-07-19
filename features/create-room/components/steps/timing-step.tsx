"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CreateRoomDraft } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";
import { DurationWheel } from "../duration-wheel";
import { formatDuration } from "../invitation-card";

const hours = Array.from({ length: 25 }, (_, hour) => hour);
const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

export function TimingStep({ draft, durationError, memberError, setDuration, setLimit }: { readonly draft: CreateRoomDraft; readonly durationError?: string; readonly memberError?: string; readonly setDuration: (value: number) => void; readonly setLimit: (value: number) => void }) {
  const [createdAt] = useState(() => Date.now());
  const selectedHour = Math.floor(draft.durationMinutes / 60);
  const selectedMinute = draft.durationMinutes % 60;
  const updateDuration = (hour: number, minute: number) => setDuration(Math.min(1440, Math.max(15, hour * 60 + minute)));

  const end = new Date(createdAt + draft.durationMinutes * 60_000);
  const time = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(end);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  return <section className={styles.stepContent} aria-labelledby="timing-title">
    <header className={styles.stepIntro}><span>Time and capacity</span><h1 id="timing-title">When should it end?</h1><p>Rooms are temporary. You can still end yours early.</p></header>
    <div className={styles.durationCard}>
      <div className={styles.durationSummary}><span>Duration</span><strong>{formatDuration(draft.durationMinutes)}</strong></div>
      <div className={styles.durationWheels}>
        <DurationWheel label="Hours" values={hours} selected={selectedHour} format={(hour) => String(hour).padStart(2, "0")} onSelect={(hour) => updateDuration(hour, selectedMinute)} />
        <DurationWheel label="Minutes" values={minutes} selected={selectedMinute} format={(minute) => String(minute).padStart(2, "0")} disabled={(minute) => selectedHour === 24 && minute > 0 || selectedHour === 0 && minute < 15} onSelect={(minute) => updateDuration(selectedHour, minute)} />
      </div>
      <p className={styles.endPreview}>Ends {time} · {zone}</p>
    </div>
    {durationError ? <p className={styles.error}>{durationError}</p> : null}
    <div className={styles.capacityCard}>
      <span><strong>Maximum people</strong><small>Free local rooms support up to 10.</small></span>
      <div><button type="button" onClick={() => setLimit(draft.memberLimit - 1)} disabled={draft.memberLimit <= 2} aria-label="Remove one person"><Icon name="minus" /></button><strong>{draft.memberLimit}</strong><button type="button" onClick={() => setLimit(draft.memberLimit + 1)} disabled={draft.memberLimit >= 10} aria-label="Add one person"><Icon name="plus" /></button></div>
    </div>
    {memberError ? <p className={styles.error}>{memberError}</p> : null}
  </section>;
}
