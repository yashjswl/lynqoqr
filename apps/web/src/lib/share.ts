import { qrBlob } from "./qr";
import type { Entry } from "./api";
import { defaultQr } from "./qr";

export const caption = (e: Pick<Entry, "title" | "shortUrl">) => `${e.title}\nShort Link: ${e.shortUrl}`;

export async function qrFile(e: Entry) {
  const blob = await qrBlob(e.shortUrl, e.logo, { ...defaultQr, ...e.qrOptions });
  return new File([blob], `${e.slug}-qr.png`, { type: "image/png" });
}

export function download(file: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Mobile: native share sheet with QR image + caption. Desktop: download QR, copy caption, open WhatsApp text. */
export async function shareToWhatsApp(e: Entry): Promise<string> {
  const file = await qrFile(e);
  const text = caption(e);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "Shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "Cancelled";
    }
  }
  download(file);
  await navigator.clipboard?.writeText(text).catch(() => {});
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return "QR downloaded, caption copied. Attach the image in WhatsApp.";
}
