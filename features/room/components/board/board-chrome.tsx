"use client";

import { Icon } from "@/components/ui/icon";
import type { BoardBackground } from "@/core/domain/room";
import styles from "./board.module.css";

type Tray = "create" | "background" | null;

const backgrounds: readonly { readonly value: BoardBackground; readonly label: string }[] = [
  { value: "stone", label: "Stone" },
  { value: "linen", label: "Linen" },
  { value: "charcoal", label: "Night" },
];

export function BoardChrome({ tray, background, canAdd, photoLimitReached, error, onTray, onFit, onCamera, onAlbum, onNote, onDoodle, onBackground }: {
  readonly tray: Tray;
  readonly background: BoardBackground;
  readonly canAdd: boolean;
  readonly photoLimitReached: boolean;
  readonly error: string | null;
  readonly onTray: (tray: Tray) => void;
  readonly onFit: () => void;
  readonly onCamera: () => void;
  readonly onAlbum: () => void;
  readonly onNote: () => void;
  readonly onDoodle: () => void;
  readonly onBackground: (background: BoardBackground) => void;
}) {
  return <>
    {tray ? <button type="button" className={styles.trayScrim} aria-label="Close board menu" onClick={() => onTray(null)} /> : null}
    {tray === "create" ? <section className={styles.createTray} aria-label="Add to board">
      <button type="button" disabled={photoLimitReached} onClick={onCamera}><i><Icon name="camera" /></i><span>Camera</span></button>
      <button type="button" disabled={photoLimitReached} onClick={onAlbum}><i><Icon name="image" /></i><span>Photos</span></button>
      <button type="button" onClick={onNote}><i><Icon name="text" /></i><span>Note</span></button>
      <button type="button" onClick={onDoodle}><i><Icon name="draw" /></i><span>Doodle</span></button>
    </section> : null}
    {tray === "background" ? <section className={styles.backgroundTray} aria-label="Canvas style">
      {backgrounds.map((item) => <button type="button" key={item.value} className={background === item.value ? styles.backgroundSelected : ""} onClick={() => onBackground(item.value)}><i className={styles[`swatch${item.value}`]} /><span>{item.label}</span></button>)}
    </section> : null}
    {error ? <div className={styles.boardToast} role="status">{error}</div> : null}
    <nav className={styles.boardDock} aria-label="Board controls">
      <button type="button" onClick={onFit} aria-label="Fit all board items"><Icon name="home" /></button>
      <button type="button" className={tray === "background" ? styles.dockActive : ""} aria-expanded={tray === "background"} onClick={() => onTray(tray === "background" ? null : "background")} aria-label="Choose canvas style"><Icon name="grid" /></button>
      {canAdd ? <button type="button" className={`${styles.dockAdd} ${tray === "create" ? styles.dockActive : ""}`} aria-expanded={tray === "create"} onClick={() => onTray(tray === "create" ? null : "create")} aria-label="Add to board"><Icon name={tray === "create" ? "close" : "plus"} /></button> : null}
    </nav>
  </>;
}
