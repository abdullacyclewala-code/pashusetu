/**
 * Client-side photo downscaling — rural uploads should be small.
 * Falls back to the original file if the browser can't decode it.
 */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.8
): Promise<{ blob: Blob; type: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      )
    );
    return { blob, type: "image/jpeg" };
  } catch {
    return { blob: file, type: file.type || "image/jpeg" };
  }
}
