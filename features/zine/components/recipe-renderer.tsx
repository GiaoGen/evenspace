import Image from "next/image";
import type { CSSProperties } from "react";
import {
  adaptRecipeTheme,
  type RecipeColorToken,
  type RecipeDefinition,
  type RecipeApplication,
  type RecipeRelationKind,
  type RecipeTypographyToken,
} from "../model/recipe-contract";
import type { ZinePhoto } from "../model/zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlanSlot,
} from "./recipe-renderer-plan";
import styles from "./recipe-renderer.module.css";

export { createRecipeRenderPlan } from "./recipe-renderer-plan";
export type {
  RecipeRenderEnvironment,
  RecipeRenderMode,
  RecipeRenderPageSide,
} from "./recipe-renderer-plan";

export function RecipeRenderer({
  recipe,
  application,
  photos,
  environment,
}: {
  readonly recipe: RecipeDefinition;
  readonly application: RecipeApplication;
  readonly photos: readonly ZinePhoto[];
  readonly environment: RecipeRenderEnvironment;
}) {
  const plan = createRecipeRenderPlan({ recipe, application, photos, environment });
  const theme = recipe.theme ?? {
    background: "#f5f1e9",
    foreground: "#20201d",
    muted: "#817c73",
    photoBackground: "#ded8cd",
  };
  const colorTokens = adaptRecipeTheme(theme);
  const canvasStyle = {
    "--recipe-background": colorTokens.paper,
    "--recipe-foreground": colorTokens.ink,
    "--recipe-muted": colorTokens["muted-ink"],
    "--recipe-photo-background": colorTokens["photo-mat"],
    "--recipe-color-paper": colorTokens.paper,
    "--recipe-color-ink": colorTokens.ink,
    "--recipe-color-muted-ink": colorTokens["muted-ink"],
    "--recipe-color-photo-mat": colorTokens["photo-mat"],
    "--recipe-color-accent-1": colorTokens["accent-1"],
    "--recipe-color-accent-2": colorTokens["accent-2"],
    "--recipe-color-accent-3": colorTokens["accent-3"],
    "--recipe-color-inverse-ink": colorTokens["inverse-ink"],
  } as CSSProperties;

  return (
    <div
      className={styles.recipeCanvas}
      data-recipe-id={recipe.id}
      data-recipe-scope={recipe.scope}
      data-recipe-render-mode={environment.mode}
      data-recipe-valid={plan.valid}
      style={canvasStyle}
    >
      {plan.slots.map((slot) => (
        <RecipeSlotView key={`${slot.id}-${slot.kind}`} slot={slot} />
      ))}
      {!plan.valid ? (
        <span className={styles.recipeError} data-recipe-error="true">
          {plan.issues[0]?.message ?? "Invalid recipe definition."}
        </span>
      ) : null}
    </div>
  );
}

function RecipeSlotView({
  slot,
}: {
  readonly slot: RecipeRenderPlanSlot;
}) {
  const slotStyle = {
    left: `${slot.rect.x * 100}%`,
    top: `${slot.rect.y * 100}%`,
    width: `${slot.rect.width * 100}%`,
    height: `${slot.rect.height * 100}%`,
    zIndex: slot.zIndex,
  } as CSSProperties;

  if (slot.kind === "photo" && !slot.photo && !slot.showPhotoPlaceholder) {
    return null;
  }
  if (slot.kind === "photo") {
    return <PhotoSlot slot={slot} style={slotStyle} />;
  }
  if (slot.kind === "color-field") {
    return <ColorFieldSlot slot={slot} style={slotStyle} />;
  }
  if (slot.kind === "note") {
    return <NoteSlot slot={slot} style={slotStyle} />;
  }
  return (
    <span
      className={styles.recipeStaticText}
      data-zine-slot-id={slot.id}
      data-slot-kind={slot.kind}
      data-typography-role={slot.typographyRole}
      style={{ ...slotStyle, ...foregroundStyle(slot.foregroundToken), ...typographyStyle(slot.typographyToken, slot.textAlign) }}
    >
      {slot.text}
    </span>
  );
}

function PhotoSlot({
  slot,
  style,
}: {
  readonly slot: RecipeRenderPlanSlot;
  readonly style: CSSProperties;
}) {
  const photo = slot.photo;
  const focusX = slot.focusX ?? 50;
  const focusY = slot.focusY ?? 50;
  const scale = slot.scale ?? 1;
  const imageStyle = slot.crossSpread
    ? {
        objectPosition: `${focusX}% ${focusY}%`,
        transform: `scale(${scale})`,
        transformOrigin: `${focusX}% ${focusY}%`,
        width: `${slot.imageWidthPercent ?? 100}%`,
        maxWidth: "none",
        left: `-${slot.imageStartPercent && slot.imageWidthPercent
          ? (slot.imageStartPercent / 100) * slot.imageWidthPercent
          : 0}%`,
      }
    : {
        objectPosition: `${focusX}% ${focusY}%`,
        transform: `scale(${scale})`,
        transformOrigin: `${focusX}% ${focusY}%`,
      };

  return (
    <figure
      className={styles.recipePhoto}
      data-zine-slot-id={slot.id}
      data-slot-kind="photo"
      data-zine-photo-id={slot.photoId}
      data-zine-placement-id={slot.placementId}
      data-zine-placement-key={slot.placementKey}
      data-zine-page-id={slot.pageId}
      style={style}
    >
      <div className={styles.recipePhotoFrame}>
        {photo ? (
          <Image
            unoptimized
            src={photo.previewUrl}
            alt={photo.fileName}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 640px) 45vw, 420px"
            style={imageStyle}
          />
        ) : slot.showPhotoPlaceholder ? (
          <span className={styles.recipePhotoPlaceholder} aria-label="Empty photo slot" />
        ) : null}
      </div>
    </figure>
  );
}

function NoteSlot({
  slot,
  style,
}: {
  readonly slot: RecipeRenderPlanSlot;
  readonly style: CSSProperties;
}) {
  const notes = slot.notes ?? [];
  const relationKinds = [...new Set(notes.flatMap((note) => note.relation ? [note.relation] : []))];
  const relation = relationKinds.length === 1 ? relationKinds[0] : undefined;
  return (
    <div
      className={styles.recipeNoteSlot}
      data-zine-slot-id={slot.id}
      data-slot-kind="note"
      data-note-relation={relation}
      data-note-relations={relationKinds.join(" ") || undefined}
      data-typography-role={slot.typographyRole}
      style={{ ...style, ...foregroundStyle(slot.foregroundToken), ...typographyStyle(slot.typographyToken, slot.textAlign), "--recipe-note-count": notes.length } as CSSProperties}
    >
      {notes.map((note) => (
        <span
          className={styles.recipeNoteItem}
          data-zine-note-photo-id={note.photoId}
          data-zine-note-photo-slot-id={note.photoSlotId}
          data-note-relation={note.relation ?? undefined}
          data-note-index={note.index + 1}
          key={`${slot.id}-${note.photoSlotId}-${note.photoId}`}
        >
          {note.text}
        </span>
      ))}
    </div>
  );
}

function ColorFieldSlot({
  slot,
  style,
}: {
  readonly slot: RecipeRenderPlanSlot;
  readonly style: CSSProperties;
}) {
  return (
    <div
      className={styles.recipeColorField}
      data-zine-slot-id={slot.id}
      data-slot-kind="color-field"
      data-fill-token={slot.fillToken}
      style={{ ...style, background: colorTokenValue(slot.fillToken) }}
    />
  );
}

function foregroundStyle(token: RecipeColorToken | undefined): CSSProperties {
  return token ? { color: colorTokenValue(token) } : {};
}

function colorTokenValue(token: RecipeColorToken | undefined) {
  if (!token) return "transparent";
  return `var(--recipe-color-${token})`;
}

const typographySizes = {
  xs: "clamp(5px, .9vw, 7px)",
  sm: "clamp(5px, 1.05vw, 8px)",
  md: "clamp(6px, 1.35vw, 10px)",
  lg: "clamp(8px, 1.8vw, 14px)",
  xl: "clamp(10px, 2.5vw, 20px)",
} as const;
const typographyLineHeights = { tight: 1.1, normal: 1.25, open: 1.45 } as const;
const typographyTracking = { tight: "-.015em", normal: "0", wide: ".08em" } as const;

function typographyStyle(
  token: RecipeTypographyToken | undefined,
  align: RecipeRenderPlanSlot["textAlign"],
): CSSProperties {
  if (!token) return {};
  return {
    fontSize: typographySizes[token.size],
    lineHeight: typographyLineHeights[token.lineHeight],
    fontWeight: token.weight,
    letterSpacing: typographyTracking[token.tracking],
    textTransform: token.transform,
    textAlign: align,
  };
}

export function getRecipeRelationLabel(relation: RecipeRelationKind | null) {
  return relation ?? "none";
}
