import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { stripOklchFromSubtree } from "./oklch-polyfill";

/**
 * Build a multi-page A4 PDF from a list of HTML section refs.
 *
 * Each section becomes exactly one A4 portrait page. Sections are captured
 * separately with html2canvas (so we never hit canvas-size limits) and
 * stitched together with jsPDF, which also gets the report metadata so the
 * file shows up properly in any PDF viewer.
 *
 * Page size is locked to A4 portrait (210×297 mm) per the Saudi / Greenlab
 * standard lab report format. If a section is taller than one page, we
 * downscale it to fit; we do NOT split a single section across multiple pages
 * (callers should pre-chunk long content into separate sections instead).
 */

export interface PdfSection {
  /** Display label for debugging — e.g. "Header + Customer Details". */
  label: string;
  /** React ref pointing at the DOM node to capture. */
  ref: React.RefObject<HTMLDivElement>;
}

export interface PdfMeta {
  /** Used as the jsPDF document title and embedded in filename. */
  reportId: string;
  /** Optional override; defaults to "Certificate of Analysis — {reportId}". */
  title?: string;
  /** jsPDF document author field. */
  author?: string;
  /** jsPDF document subject field. */
  subject?: string;
}

export interface BuildPdfOptions {
  sections: PdfSection[];
  meta: PdfMeta;
  /**
   * html2canvas scale. Default 2 (≈150 DPI). Lower this if you hit OOM on
   * very dense reports; raise it for crisper output on small reports.
   */
  scale?: number;
  /**
   * jsPDF filename. Defaults to `Certificate_of_Analysis_{reportId}.pdf`.
   * The `.pdf` extension is added automatically if missing.
   */
  filename?: string;
}

const RGB_WHITE = "#ffffff";

/**
 * Capture a single DOM section to a high-resolution canvas, then return the
 * canvas + its PNG data URL. Errors are surfaced so the caller can show a
 * useful toast instead of a silent failure.
 */
async function captureSection(
  node: HTMLDivElement,
  scale: number,
  label: string,
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string; pxWidth: number; pxHeight: number }> {
  // Pre-flight: log what we're about to capture so silent failures show up in
  // the browser console. This is the single most useful debugging hook when
  // html2canvas silently produces a blank canvas.
  // eslint-disable-next-line no-console
  console.info(
    `[pdf-report] capturing section "${label}" — ${node.offsetWidth}×${node.offsetHeight}px @ scale=${scale}`,
  );

  let canvas: HTMLCanvasElement;
  try {
    // CRITICAL: Tailwind v4 compiles its color utilities to `oklch(...)` and
    // html2canvas@1.4.1 throws on those values. Walk the subtree first and
    // rewrite every color-bearing computed style into rgb() so html2canvas
    // can parse the result.
    stripOklchFromSubtree(node);

    canvas = await html2canvas(node, {
      scale,
      logging: false,
      // useCORS causes silent failure for cross-origin images that don't ship
      // CORS headers (which includes many local /images/* in dev). Local
      // same-origin images work fine without it.
      useCORS: false,
      allowTaint: true,
      backgroundColor: RGB_WHITE,
      // Explicitly bound the capture window — html2canvas sometimes picks the
      // viewport size which can clip long reports to a single screen.
      windowWidth: Math.max(node.scrollWidth, node.offsetWidth, 800),
      windowHeight: Math.max(node.scrollHeight, node.offsetHeight, 600),
      // Foreign objects (e.g. SVGs from qrcode.react) need this off; they're
      // rendered as images by html2canvas either way.
      foreignObjectRendering: false,
    });
  } catch (err) {
    // Re-throw with the section label so the toast surfaces something useful.
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to capture section "${label}": ${msg}`);
  }

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(
      `Section "${label}" produced an empty canvas (0×0). ` +
        `The DOM node may be hidden or detached.`,
    );
  }

  const dataUrl = canvas.toDataURL("image/png");
  return {
    canvas,
    dataUrl,
    pxWidth: canvas.width,
    pxHeight: canvas.height,
  };
}

/**
 * Draw a captured section onto the CURRENT page of the PDF, fitting it inside
 * A4 while preserving aspect ratio. If the section is wider than A4 it is
 * downscaled proportionally; if it is taller than A4 it is also downscaled so
 * the whole section fits on one page (matches the user preference for "all of
 * section X on a single page").
 */
function drawSectionOnCurrentPage(
  pdf: jsPDF,
  dataUrl: string,
  pxWidth: number,
  pxHeight: number,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  // Fit the captured image into the page while preserving aspect ratio.
  // (Unlike the previous single-pass implementation, this never overflows —
  // content is always bounded by the A4 page.)
  const widthRatio = pageWidth / pxWidth;
  const heightRatio = pageHeight / pxHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  const renderWidth = pxWidth * ratio;
  const renderHeight = pxHeight * ratio;

  // Centre the image on the page (otherwise it left-aligns by default).
  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;

  pdf.addImage(
    dataUrl,
    "PNG",
    offsetX,
    offsetY,
    renderWidth,
    renderHeight,
    undefined,
    "FAST",
  );
}

/**
 * Produce and download a multi-page A4 PDF for the given sections.
 *
 * Returns the number of pages written. Throws if any section ref is missing or
 * html2canvas fails — callers should wrap in try/catch and surface a toast.
 */
export async function buildAndDownloadPdf(options: BuildPdfOptions): Promise<number> {
  const { sections, meta, scale = 2 } = options;
  const filename = (options.filename ?? `Certificate_of_Analysis_${meta.reportId}.pdf`)
    .replace(/\.pdf$/i, "")
    .concat(".pdf");

  // First page is created up-front so we can set metadata before any content.
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // jsPDF metadata — these surface in PDF viewer "Properties" dialogs and
  // make the file self-identifying.
  pdf.setProperties({
    title: meta.title ?? `Certificate of Analysis — ${meta.reportId}`,
    author: meta.author ?? "Green Lab KSA",
    subject: meta.subject ?? "Laboratory Certificate of Analysis (COA)",
    creator: "Green Lab LIMS",
    keywords: `COA, ${meta.reportId}, GreenlabLIMS`,
  });

  let pagesWritten = 0;
  for (const section of sections) {
    if (!section.ref.current) {
      throw new Error(`PDF section "${section.label}" has no DOM ref attached`);
    }
    const { dataUrl, pxWidth, pxHeight } = await captureSection(
      section.ref.current,
      scale,
      section.label,
    );

    if (pagesWritten === 0) {
      // jsPDF pre-creates one blank page; reuse it instead of adding a
      // duplicate. Subsequent sections each get their own fresh page.
      drawSectionOnCurrentPage(pdf, dataUrl, pxWidth, pxHeight);
    } else {
      pdf.addPage("a4", "portrait");
      drawSectionOnCurrentPage(pdf, dataUrl, pxWidth, pxHeight);
    }
    pagesWritten += 1;
  }

  if (pagesWritten === 0) {
    throw new Error("PDF has no sections to render");
  }

  pdf.save(filename);
  return pagesWritten;
}
