const MAX_LOCAL_PHOTO_BYTES = 12_000_000;
const MAX_LOCAL_PHOTO_BLOB_BYTES = 2_250_000;
const IMAGE_FILE_PATTERN = /\.(avif|gif|heic|heif|jpeg|jpg|png|webp)$/i;

export type CompressedImage = { readonly blob: Blob; readonly aspectRatio: number };

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

function renderImage(source: CanvasImageSource, naturalWidth: number, naturalHeight: number, maxSide: number, quality: number): Promise<Blob> {
  const ratio = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * ratio));
  const height = Math.max(1, Math.round(naturalHeight * ratio));
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

export async function compressImage(file: File): Promise<CompressedImage> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    if (typeof createImageBitmap === "function") source = await createImageBitmap(file);
  } catch { source = null; }
  source ??= await decodeWithImageElement(file);
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("Image has no readable dimensions.");
  try {
    for (const attempt of [{ side: 1600, quality: .74 }, { side: 1200, quality: .7 }, { side: 900, quality: .68 }]) {
      const blob = await renderImage(source, width, height, attempt.side, attempt.quality);
      if (blob.size <= MAX_LOCAL_PHOTO_BLOB_BYTES) return { blob, aspectRatio: width / height };
    }
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
  throw new Error("Image is too large for local storage.");
}
