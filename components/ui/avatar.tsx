import Image from "next/image";

import styles from "./avatar.module.css";

export function Avatar({
  src,
  text,
  displayName,
  className = "",
  size = 64,
  decorative = false,
}: {
  readonly src?: string | null;
  readonly text: string;
  readonly displayName: string;
  readonly className?: string;
  readonly size?: number;
  readonly decorative?: boolean;
}) {
  return (
    <span
      className={`${styles.avatar} ${className}`}
      aria-hidden={decorative || undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={decorative ? "" : `${displayName} avatar`}
          fill
          sizes={`${size}px`}
          unoptimized
        />
      ) : (
        text
      )}
    </span>
  );
}
