"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function InvitationQr({
  value,
  size = 168,
  className = "",
}: {
  readonly value: string;
  readonly size?: number;
  readonly className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current || !value) return;
    void QRCode.toCanvas(canvas.current, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#20241f", light: "#f7f3eb" },
    });
  }, [size, value]);

  if (!value) {
    return <span className={className} aria-label="QR code available after room creation">QR</span>;
  }

  return (
    <canvas
      ref={canvas}
      className={className}
      aria-label="Scannable private room invitation"
      role="img"
    />
  );
}
