"use client";

import type { CreateRoomDraft } from "../model/create-room-machine";
import styles from "./create-room-wizard.module.css";

const qrCells = Array.from({ length: 81 }, (_, index) => index % 2 === 0 || index % 13 === 0 || [3, 7, 17, 29, 41, 53, 67, 73].includes(index));

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${rest}m`;
}

export function InvitationCard({ name, draft, endTime, compact = false }: { readonly name: string; readonly draft: CreateRoomDraft; readonly endTime: string; readonly compact?: boolean }) {
  return <article className={`${styles.inviteCard} ${compact ? styles.inviteCardCompact : ""}`}>
    <header><strong>{name || "Untitled room"}</strong><span>Host-led</span></header>
    <div className={styles.inviteCenter}><div className={styles.fakeQr} aria-label="Invitation QR preview">{qrCells.map((filled, index) => <i key={index} className={filled ? styles.qrFilled : ""} />)}</div></div>
    <footer><span><small>Duration</small>{formatDuration(draft.durationMinutes)}</span><span><small>Ends</small>{endTime}</span><span><small>People</small>Up to {draft.memberLimit}</span></footer>
  </article>;
}

export function downloadInvitationCard(name: string, draft: CreateRoomDraft, endTime: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#d1c4b2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(32,29,25,.24)";
  context.lineWidth = 3;
  context.strokeRect(48, 48, 984, 1254);
  context.fillStyle = "#201d19";
  context.font = "600 72px Georgia, serif";
  context.fillText(name.slice(0, 24), 76, 130, 760);
  context.font = "600 24px Arial, sans-serif";
  context.fillText("HOST-LED", 790, 116, 220);
    const cell = 42;
    const startX = 351;
    const startY = 370;
    context.fillStyle = "#f8f3eb";
    context.fillRect(startX - 35, startY - 35, cell * 9 + 70, cell * 9 + 70);
    context.fillStyle = "#201d19";
    qrCells.forEach((filled, index) => { if (filled) context.fillRect(startX + index % 9 * cell, startY + Math.floor(index / 9) * cell, cell - 7, cell - 7); });
  context.textAlign = "left";
  context.font = "600 22px Arial, sans-serif";
  context.fillText(`DURATION  ${formatDuration(draft.durationMinutes)}`, 76, 1170);
  context.fillText(`ENDS  ${endTime}`, 420, 1170);
  context.fillText(`PEOPLE  UP TO ${draft.memberLimit}`, 760, 1170);
  const anchor = document.createElement("a");
  anchor.download = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "eventspace"}-invite.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
