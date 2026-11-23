const minimumSize = 1.5 * 1024 ** 2;
const maximumEdge = 3072;

export function canOptimizePhoto(file: File) {
  return file.type === "image/jpeg" && file.size >= minimumSize && typeof createImageBitmap === "function";
}

/** Called only after the user chooses to upload a smaller copy. */
export async function optimizePhoto(file: File, signal: AbortSignal): Promise<File> {
  signal.throwIfAborted();
  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    signal.throwIfAborted();
    const scale = Math.min(1, maximumEdge / Math.max(bitmap.width, bitmap.height));
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    bitmap = undefined;
    const output = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/jpeg", .88));
    signal.throwIfAborted();
    return output?.type === file.type && output.size < file.size * .8
      ? new File([output], file.name, { type: output.type, lastModified: file.lastModified })
      : file;
  } catch {
    signal.throwIfAborted();
    return file;
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}
