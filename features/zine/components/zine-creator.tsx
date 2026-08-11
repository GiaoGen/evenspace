"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { createUuid } from "@/core/domain/uuid";
import {
  initialZineCreatorHistoryState,
  zineCreatorHistoryReducer,
  type EditableZineStep,
  type ZinePhoto,
} from "../model/zine-draft";
import { NameStep } from "./steps/name-step";
import { OverviewStep } from "./steps/overview-step";
import { PhotosStep } from "./steps/photos-step";
import { StyleStep } from "./steps/style-step";
import { ManualLayoutStep } from "./steps/manual-layout-step";
import { ZineReader } from "./reader/zine-reader";
import { ZineShell } from "./zine-shell";

export function ZineCreator() {
  const [history, dispatch] = useReducer(zineCreatorHistoryReducer, initialZineCreatorHistoryState);
  const state = history.present;
  const [nameAttempted, setNameAttempted] = useState(false);
  const [aiLayoutEnabled, setAiLayoutEnabled] = useState(false);
  const previewUrls = useRef(new Set<string>());
  const hasName = Boolean(state.draft.name.trim());
  const hasPhotos = state.draft.photos.length > 0;
  const hasStyle = state.draft.styleId !== null;
  const canContinue = state.step === "name"
    ? hasName
    : state.step === "photos"
      ? hasPhotos
      : state.step === "style"
        ? hasStyle
        : state.step === "manual" || state.step === "overview"
          ? hasName && hasPhotos && hasStyle
          : false;

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.step === "reader") return;
    if (state.step === "name") setNameAttempted(true);
    if (!canContinue) return;
    const nextStep = state.step === "name"
      ? "photos"
      : state.step === "photos"
        ? "style"
        : state.step === "style"
          ? aiLayoutEnabled ? "overview" : "manual"
          : state.step === "manual" || state.step === "overview"
            ? "reader"
            : null;
    if (nextStep) dispatch({ type: "GO_TO", step: nextStep });
  }

  async function addPhotos(files: readonly File[]) {
    const results = await Promise.allSettled(files.map(createZinePhoto));
    const photos = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    for (const photo of photos) previewUrls.current.add(photo.previewUrl);
    if (photos.length > 0) dispatch({ type: "ADD_PHOTOS", photos });
    if (photos.length !== files.length) throw new Error("One or more images could not be decoded");
  }

  function removePhoto(photo: ZinePhoto) {
    URL.revokeObjectURL(photo.previewUrl);
    previewUrls.current.delete(photo.previewUrl);
    dispatch({ type: "REMOVE_PHOTO", photoId: photo.id });
  }

  function canNavigate(step: EditableZineStep) {
    if (step === "name") return true;
    if (step === "photos") return hasName;
    if (step === "style") return hasName && hasPhotos;
    return hasName && hasPhotos && hasStyle;
  }

  function goBack() {
    const previousStep = state.step === "photos"
      ? "name"
      : state.step === "style"
        ? "photos"
        : state.step === "manual" || state.step === "overview"
          ? "style"
          : null;
    if (previousStep) dispatch({ type: "GO_TO", step: previousStep });
  }

  function setAiLayout(nextEnabled: boolean) {
    setAiLayoutEnabled(nextEnabled);
    if (state.step === "manual" || state.step === "overview") {
      dispatch({ type: "GO_TO", step: nextEnabled ? "overview" : "manual" });
    }
  }

  if (state.step === "reader") {
    return (
      <ZineReader
        draft={state.draft}
        onClose={() => dispatch({ type: "GO_TO", step: aiLayoutEnabled ? "overview" : "manual" })}
      />
    );
  }

  return (
    <ZineShell
      step={state.step}
      canContinue={canContinue}
      aiLayoutEnabled={aiLayoutEnabled}
      onBack={goBack}
      canNavigate={canNavigate}
      onNavigate={(step) => dispatch({ type: "GO_TO", step })}
      onAiLayoutChange={setAiLayout}
      onSubmit={submit}
    >
      {state.step === "name" ? (
        <NameStep
          name={state.draft.name}
          showError={nameAttempted && !hasName}
          onChange={(value) => {
            dispatch({ type: "SET_NAME", value });
            if (value.trim()) setNameAttempted(false);
          }}
        />
      ) : state.step === "photos" ? (
        <PhotosStep
          photos={state.draft.photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
          onCaptionChange={(photoId, value) => dispatch({ type: "SET_CAPTION", photoId, value })}
        />
      ) : state.step === "style" ? (
        <StyleStep
          photos={state.draft.photos}
          selectedStyleId={state.draft.styleId}
          onSelect={(styleId) => dispatch({ type: "SET_STYLE", styleId })}
        />
      ) : state.step === "manual" ? (
        <ManualLayoutStep
          draft={state.draft}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={() => dispatch({ type: "UNDO" })}
          onRedo={() => dispatch({ type: "REDO" })}
          onPlacementFocusChange={(pageId, placementId, focusX, focusY, scale) => dispatch({
            type: "SET_PLACEMENT_FOCUS",
            pageId,
            placementId,
            focusX,
            focusY,
            scale,
          })}
          onAddPage={(spreadId, side) => dispatch({
            type: "ADD_MANUAL_PAGE",
            spreadId,
            side,
          })}
          onPlacePhoto={(pageId, photoId, replacePhotoId) => dispatch({
            type: "PLACE_MANUAL_PHOTO",
            pageId,
            photoId,
            replacePhotoId,
          })}
          onApplyRecipe={(pageId, recipeId) => dispatch({
            type: "APPLY_RECIPE",
            pageId,
            recipeId,
          })}
        />
      ) : (
        <OverviewStep
          draft={state.draft}
          onEdit={(step) => dispatch({ type: "GO_TO", step })}
        />
      )}
    </ZineShell>
  );
}

async function createZinePhoto(file: File): Promise<ZinePhoto> {
  const previewUrl = URL.createObjectURL(file);
  try {
    const dimensions = await readImageDimensions(previewUrl);
    return {
      id: createUuid(),
      file,
      previewUrl,
      fileName: file.name,
      width: dimensions.width,
      height: dimensions.height,
      caption: "",
      defaultFocusX: 50,
      defaultFocusY: 50,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

function readImageDimensions(src: string) {
  return new Promise<{ readonly width: number; readonly height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image dimensions could not be read"));
    image.src = src;
  });
}
