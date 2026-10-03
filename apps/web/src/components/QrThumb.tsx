import { useEffect, useRef } from "react";
import { defaultQr, makeQr } from "../lib/qr";
import type { Entry } from "../lib/api";

export default function QrThumb({ entry, size = 56 }: { entry: Pick<Entry, "shortUrl" | "logo" | "qrOptions">; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    makeQr(entry.shortUrl, entry.logo, { ...defaultQr, ...entry.qrOptions }, size * 2).append(el);
    el.querySelector("canvas")?.setAttribute("style", `width:${size}px;height:${size}px`);
  }, [entry.shortUrl, entry.logo, entry.qrOptions, size]);
  return <div ref={ref} className="qr-thumb" style={{ width: size, height: size }} aria-hidden />;
}
