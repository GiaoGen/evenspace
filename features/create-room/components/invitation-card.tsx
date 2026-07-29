"use client";

import QRCode from "qrcode";

import { InvitationQr } from "@/components/ui/invitation-qr";
import type { CreateRoomDraft } from "../model/create-room-machine";
import styles from "./create-room-wizard.module.css";

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${rest}m`;
}

export function InvitationCard({ name, draft, endTime, compact = false, inviteCode, inviteUrl = "" }: { readonly name: string; readonly draft: CreateRoomDraft; readonly endTime: string; readonly compact?: boolean; readonly inviteCode?: string; readonly inviteUrl?: string }) {
  return <article className={`${styles.inviteCard} ${compact ? styles.inviteCardCompact : ""}`}>
    <header><strong>{name || "Untitled room"}</strong><span>Host-led</span></header>
    <div className={styles.inviteCenter}><InvitationQr value={inviteUrl} size={compact ? 108 : 168} className={styles.inviteQr} />{inviteCode ? <strong className={styles.inviteCode}>{inviteCode}</strong> : null}</div>
    <footer><span><small>Duration</small>{formatDuration(draft.durationMinutes)}</span><span><small>Ends</small>{endTime}</span><span><small>People</small>Up to {draft.memberLimit}</span></footer>
  </article>;
}

export async function downloadInvitationCard(name: string, draft: CreateRoomDraft, endTime: string, inviteUrl: string, inviteCode: string) {
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
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 448,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#201d19", light: "#f8f3eb" },
  });
  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await qrImage.decode();
  context.drawImage(qrImage, 316, 335, 448, 448);
  context.textAlign = "center";
  context.font = "600 58px Georgia, serif";
  context.fillText(inviteCode, 540, 880, 850);
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
