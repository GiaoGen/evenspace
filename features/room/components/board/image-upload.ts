const MAX_LOCAL_PHOTO_BYTES = 12_000_000;
const MAX_DISPLAY_BLOB_BYTES = 2_250_000;
const MAX_THUMBNAIL_BLOB_BYTES = 180_000;
const IMAGE_FILE_PATTERN = /\.(avif|gif|heic|heif|jpeg|jpg|png|webp)$/i;

export type CompressedImage = { readonly blob: Blob; readonly aspectRatio: number };
export type PreparedImage = {
  readonly displayBlob: Blob;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly thumbnailBlob: Blob;
  readonly thumbnailWidth: number;
  readonly thumbnailHeight: number;
  readonly placeholderBlob: Blob;
  readonly aspectRatio: number;
};

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/") && !IMAGE_FILE_PATTERN.test(file.name)) return "Choose an image file.";
  if (file.size > MAX_LOCAL_PHOTO_BYTES) return "For local storage, choose an image under 12 MB.";
  return null;
}

function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image could not be decoded.")); };
    image.src = url;
  });
}

function dimensionsFor(naturalWidth: number, naturalHeight: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  return { width: Math.max(1, Math.round(naturalWidth * ratio)), height: Math.max(1, Math.round(naturalHeight * ratio)) };
}

function renderImage(source: CanvasImageSource, naturalWidth: number, naturalHeight: number, maxSide: number, quality: number): Promise<Blob> {
  const { width, height } = dimensionsFor(naturalWidth, naturalHeight, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.fillStyle = "#f7f3ed";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image could not be compressed.")), "image/jpeg", quality));
}

async function prepareOnMainThread(file: File): Promise<PreparedImage> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    if (typeof createImageBitmap === "function") source = await createImageBitmap(file);
  } catch { source = null; }
  source ??= await decodeWithImageElement(file);
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("Image has no readable dimensions.");
  try {
    let display: { blob: Blob; width: number; height: number } | null = null;
    for (const attempt of [{ side: 1600, quality: .78 }, { side: 1400, quality: .74 }, { side: 1200, quality: .70 }, { side: 1000, quality: .68 }]) {
      const blob = await renderImage(source, width, height, attempt.side, attempt.quality);
      if (blob.size <= MAX_DISPLAY_BLOB_BYTES) { display = { blob, ...dimensionsFor(width, height, attempt.side) }; break; }
    }
    if (!display) throw new Error("Image is too large for local storage.");
    let thumbnail: { blob: Blob; width: number; height: number } | null = null;
    for (const attempt of [{ side: 480, quality: .72 }, { side: 360, quality: .68 }, { side: 280, quality: .64 }]) {
      const blob = await renderImage(source, width, height, attempt.side, attempt.quality);
      if (blob.size <= MAX_THUMBNAIL_BLOB_BYTES) { thumbnail = { blob, ...dimensionsFor(width, height, attempt.side) }; break; }
    }
    if (!thumbnail) throw new Error("Image thumbnail could not be prepared.");
    const placeholderBlob = await renderImage(source, width, height, 32, .45);
    return {
      displayBlob: display.blob,
      displayWidth: display.width,
      displayHeight: display.height,
      thumbnailBlob: thumbnail.blob,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
      placeholderBlob,
      aspectRatio: width / height,
    };
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

function prepareWithWorker(file: File): Promise<PreparedImage> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./image-processing.worker.ts", import.meta.url));
    const finish = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<{ readonly ok: true; readonly image: PreparedImage } | { readonly ok: false; readonly message: string }>) => {
      finish();
      if (event.data.ok) resolve(event.data.image);
      else reject(new Error(event.data.message));
    };
    worker.onerror = () => { finish(); reject(new Error("Image worker could not prepare this photo.")); };
    worker.postMessage({ file });
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function") {
    try { return await prepareWithWorker(file); }
    catch { /* Safari and older engines fall back to the same bounded main-thread path. */ }
  }
  return prepareOnMainThread(file);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image placeholder could not be encoded."));
    reader.onerror = () => reject(reader.error ?? new Error("Image placeholder could not be encoded."));
    reader.readAsDataURL(blob);
  });
}

/** @deprecated Use prepareImage so callers retain thumbnail and placeholder variants. */
export async function compressImage(file: File): Promise<CompressedImage> {
  const image = await prepareImage(file);
  return { blob: image.displayBlob, aspectRatio: image.aspectRatio };
}
