"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import styles from "./board.module.css";

type Point = { readonly x: number; readonly y: number };
type Stroke = { readonly points: readonly Point[]; readonly color: string; readonly size: number; readonly tool: "brush" | "eraser" };
type View = { readonly x: number; readonly y: number; readonly scale: number };

const colors = ["#171613", "#9f3f35", "#52715f", "#49647f", "#c29b55"] as const;
const sizes = [3, 7, 14] as const;

function paintStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;
  context.save();
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.size;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.stroke();
  context.restore();
}

export function DoodleStudio({ backgroundClass, onClose, onAdd }: { readonly backgroundClass: string; readonly onClose: () => void; readonly onAdd: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const activeStrokeRef = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  const pinchRef = useRef<{ distance: number; center: Point; view: View } | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [undone, setUndone] = useState<readonly Stroke[]>([]);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [color, setColor] = useState<(typeof colors)[number]>(colors[0]);
  const [size, setSize] = useState<(typeof sizes)[number]>(sizes[1]);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const redraw = useCallback((value: readonly Stroke[]) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    value.forEach((stroke) => paintStroke(context, stroke));
  }, []);

  useEffect(() => { redraw(strokes); }, [redraw, strokes]);

  useEffect(() => () => { if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current); }, []);
  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect || rect.width <= 0 || rect.height <= 0) return null;
    return { x: (event.clientX - rect.left) / rect.width * canvas.width, y: (event.clientY - rect.top) / rect.height * canvas.height };
  }

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, view };
      activeStrokeRef.current = null;
      redraw(strokes);
      return;
    }
    const point = canvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStrokeRef.current = { pointerId: event.pointerId, stroke: { points: [point], color, size, tool } };
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const nextScale = Math.min(3.5, Math.max(.72, pinchRef.current.view.scale * distance / pinchRef.current.distance));
      const ratio = nextScale / pinchRef.current.view.scale;
      setView({ x: center.x - (pinchRef.current.center.x - pinchRef.current.view.x) * ratio, y: center.y - (pinchRef.current.center.y - pinchRef.current.view.y) * ratio, scale: nextScale });
      return;
    }
    const active = activeStrokeRef.current;
    const point = canvasPoint(event);
    const context = canvasRef.current?.getContext("2d");
    if (!active || active.pointerId !== event.pointerId || !point || !context) return;
    const previous = active.stroke.points[active.stroke.points.length - 1];
    const nextStroke = { ...active.stroke, points: [...active.stroke.points, point] };
    paintStroke(context, { ...nextStroke, points: [previous, point] });
    activeStrokeRef.current = { ...active, stroke: nextStroke };
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.stroke.points.length > 1) {
      setStrokes((current) => [...current, active.stroke]);
      setUndone([]);
    }
    activeStrokeRef.current = null;
  }

  function chooseSize(next: (typeof sizes)[number]) {
    setSize(next);
    setPreviewVisible(true);
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => setPreviewVisible(false), 520);
  }

  function undo() {
    const removed = strokes[strokes.length - 1];
    if (!removed) return;
    setStrokes(strokes.slice(0, -1));
    setUndone([...undone, removed]);
  }

  function redo() {
    const restored = undone[undone.length - 1];
    if (!restored) return;
    setUndone(undone.slice(0, -1));
    setStrokes([...strokes, restored]);
  }

  function finish() {
    const source = canvasRef.current;
    if (!source || !strokes.length) return;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f7f3ed";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(source, 0, 0);
    output.toBlob((blob) => { if (blob) onAdd(blob); }, "image/png");
  }

  if (!mounted) return null;

  return createPortal(<div className={`${styles.studioOverlay} ${backgroundClass}`} role="dialog" aria-modal="true" aria-label="Doodle studio">
    <div className={styles.doodlePaperStage}>
      <canvas ref={canvasRef} width={960} height={720} className={styles.doodlePaper} style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})` }} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      {previewVisible ? <span className={styles.brushPreview} style={{ width: size * 2.5, height: size * 2.5, background: tool === "eraser" ? "#f7f3ed" : color, borderColor: tool === "eraser" ? "#171613" : color }} /> : null}
    </div>
    <div className={styles.doodleColorCard}>{colors.map((value) => <button type="button" key={value} aria-label={`Use color ${value}`} className={tool === "brush" && color === value ? styles.activeSwatch : ""} style={{ background: value }} onClick={() => { setColor(value); setTool("brush"); }} />)}</div>
    <div className={styles.doodleToolRow}>
      <div className={styles.doodleToolCard}><button type="button" className={tool === "brush" ? styles.activeTool : ""} onClick={() => setTool("brush")} aria-label="Use brush"><Icon name="draw" /></button><button type="button" className={tool === "eraser" ? styles.activeTool : ""} onClick={() => setTool("eraser")} aria-label="Use eraser"><Icon name="eraser" /></button>{sizes.map((value) => <button type="button" key={value} className={size === value ? styles.activeSize : ""} onClick={() => chooseSize(value)} aria-label={`Use ${value === 3 ? "fine" : value === 7 ? "medium" : "bold"} brush`}><i style={{ width: Math.max(4, value), height: Math.max(4, value) }} /></button>)}</div>
      <div className={styles.doodleHistoryCard}><button type="button" disabled={!strokes.length} onClick={undo} aria-label="Undo"><Icon name="undo" /></button><button type="button" disabled={!undone.length} onClick={redo} aria-label="Redo"><Icon name="redo" /></button></div>
      <div className={styles.doodleCommitCard}><button type="button" onClick={onClose} aria-label="Close doodle studio"><Icon name="close" /></button><button type="button" className={styles.confirmAction} disabled={!strokes.length} onClick={finish} aria-label="Add doodle to board"><Icon name="check" /></button></div>
    </div>
  </div>, document.body);
}
