import QRCodeStyling from "qr-code-styling";
import type { QrOptions } from "./api";

export const defaultQr: QrOptions = { fg: "#111111", bg: "#ffffff", logoScale: 0.25 };

export function makeQr(data: string, logo: string | null, o: QrOptions, size = 320) {
  return qrStyling({ data, logo, o, size });
}

function qrStyling({ data, logo, o, size }: { data: string; logo: string | null; o: QrOptions; size: number }) {
  return new QRCodeStyling({
    width: size,
    height: size,
    type: "canvas",
    data,
    image: logo ?? undefined,
    margin: 8,
    qrOptions: { errorCorrectionLevel: "H" }, // keeps it scannable with a logo in the middle
    dotsOptions: { color: o.fg, type: "rounded" },
    backgroundOptions: { color: o.bg },
    imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: Math.min(o.logoScale, 0.3) },
  });
}

export async function qrBlob(data: string, logo: string | null, o: QrOptions, size = 1024): Promise<Blob> {
  const blob = await makeQr(data, logo, o, size).getRawData("png");
  if (!blob) throw new Error("Could not render QR");
  return blob as Blob;
}
