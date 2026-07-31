type PreparedImage = {
  readonly displayBlob: Blob;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly thumbnailBlob: Blob;
  readonly thumbnailWidth: number;
  readonly thumbnailHeight: number;
  readonly placeholderBlob: Blob;
  readonly aspectRatio: number;
};

const MAX_DISPLAY_BLOB_BYTES = 2_250_000;
const MAX_THUMBNAIL_BLOB_BYTES = 180_000;

function dimensionsFor(source: ImageBitmap, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(source.width, source.height));
  return { width: Math.max(1, Math.round(source.width * ratio)), height: Math.max(1, Math.round(source.height * ratio)) };
}

async function renderImage(source: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const { width, height } = dimensionsFor(source, maxSide);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image canvas is unavailable.");
  context.fillStyle = "#f7f3ed";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

async function prepareImage(file: Blob): Promise<PreparedImage> {
  const source = await createImageBitmap(file);
  try {
    let display: { blob: Blob; width: number; height: number } | null = null;
    for (const attempt of [{ side: 1600, quality: .78 }, { side: 1400, quality: .74 }, { side: 1200, quality: .70 }, { side: 1000, quality: .68 }]) {
      const blob = await renderImage(source, attempt.side, attempt.quality);
      if (blob.size <= MAX_DISPLAY_BLOB_BYTES) { display = { blob, ...dimensionsFor(source, attempt.side) }; break; }
    }
    if (!display) throw new Error("Image is too large for local storage.");
    let thumbnail: { blob: Blob; width: number; height: number } | null = null;
    for (const attempt of [{ side: 480, quality: .72 }, { side: 360, quality: .68 }, { side: 280, quality: .64 }]) {
      const blob = await renderImage(source, attempt.side, attempt.quality);
      if (blob.size <= MAX_THUMBNAIL_BLOB_BYTES) { thumbnail = { blob, ...dimensionsFor(source, attempt.side) }; break; }
    }
    if (!thumbnail) throw new Error("Image thumbnail could not be prepared.");
    return {
      displayBlob: display.blob,
      displayWidth: display.width,
      displayHeight: display.height,
      thumbnailBlob: thumbnail.blob,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
      placeholderBlob: await renderImage(source, 32, .45),
      aspectRatio: source.width / source.height,
    };
  } finally {
    source.close();
  }
}

self.addEventListener("message", (event: MessageEvent<{ readonly file: Blob }>) => {
  void prepareImage(event.data.file)
    .then((image) => self.postMessage({ ok: true as const, image }))
    .catch((error: unknown) => self.postMessage({ ok: false as const, message: error instanceof Error ? error.message : "Image could not be prepared." }));
});
