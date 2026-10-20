import { QRCodeSVG } from "qrcode.react";

export interface QrCodeProps {
  value: string;
  /** Edge length in px. */
  size?: number;
  /** QR error-correction level. Defaults to "M" — matches ZATCA Phase-2 minimum. */
  level?: "L" | "M" | "Q" | "H";
}

/**
 * Real, scannable QR code rendered as SVG. Works with the html2canvas → jsPDF
 * PDF pipeline (SVG round-trips cleanly; no foreignObject use).
 */
export function QrCode({ value, size = 120, level = "M" }: QrCodeProps) {
  return (
    <div
      className="bg-white p-2 rounded-md border border-gray-200 inline-block"
      style={{ width: size, height: size }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
