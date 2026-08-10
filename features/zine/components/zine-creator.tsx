"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { createUuid } from "@/core/domain/uuid";
import {
  initialZineCreatorState,
  zineSteps,
  zineCreatorReducer,
  type EditableZineStep,
  type ZinePhoto,
} from "../model/zine-draft";
import { NameStep } from "./steps/name-step";
import { OverviewStep } from "./steps/overview-step";
import { PhotosStep } from "./steps/photos-step";
import { StyleStep } from "./steps/style-step";
import { ZineReader } from "./reader/zine-reader";
import { ZineShell } from "./zine-shell";

export function ZineCreator() {
  const [state, dispatch] = useReducer(zineCreatorReducer, initialZineCreatorState);
  const [nameAttempted, setNameAttempted] = useState(false);
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
        : state.step === "overview"
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
    const currentIndex = zineSteps.indexOf(state.step);
    const nextStep = zineSteps[currentIndex + 1];
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
    const currentIndex = zineSteps.indexOf(state.step);
    const previousStep = zineSteps[currentIndex - 1];
    if (previousStep && previousStep !== "reader") dispatch({ type: "GO_TO", step: previousStep });
  }

  if (state.step === "reader") {
    return (
      <ZineReader
        draft={state.draft}
        onClose={() => dispatch({ type: "GO_TO", step: "overview" })}
      />
    );
  }

  return (
    <ZineShell
      step={state.step}
      canContinue={canContinue}
      onBack={goBack}
      canNavigate={canNavigate}
      onNavigate={(step) => dispatch({ type: "GO_TO", step })}
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
