/**
 * Lazy-loaded runtime for PDF.js + pdf-lib.
 * Tools that need PDF rendering (dark-to-light) call `getPdfJs()` here.
 * Tools that only need pdf-lib use `getPdfLib()`.
 */

type PdfJs = typeof import('pdfjs-dist');
type PdfLib = typeof import('pdf-lib');

let pdfjsPromise: Promise<PdfJs> | null = null;
let pdfLibPromise: Promise<PdfLib> | null = null;

export async function getPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      // Self-hosted worker from the same package version: no third-party
      // request, and it keeps working offline.
      const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function getPdfLib(): Promise<PdfLib> {
  if (!pdfLibPromise) {
    pdfLibPromise = import('pdf-lib');
  }
  return pdfLibPromise;
}

export function downloadBlob(blob: Blob, filename: string) {
  // Let the UI offer "Download again" without re-running the tool.
  window.dispatchEvent(new CustomEvent('pb:download', { detail: { blob, filename } }));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

export function progressBar(el: HTMLElement, percent: number, label?: string) {
  const bar = el.querySelector<HTMLElement>('[data-progress-bar]');
  const text = el.querySelector<HTMLElement>('[data-progress-text]');
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (text) text.textContent = label ?? `${Math.round(percent)}%`;
}

/** Options collected from a tool form. Checkboxes arrive as booleans. */
export type ToolOptions = Record<string, string | boolean>;

/** Every tool module exports `run` with this shape. Return value is shown as the final status line. */
export type ToolRunner = (files: File[], opts: ToolOptions, statusEl: HTMLElement) => Promise<string | void>;

export const MM_TO_PT = 72 / 25.4;

export function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

export function num(v: string | boolean | undefined, fallback: number): number {
  const n = typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Parse "1-5, 8, 11-13" into sorted 1-based page numbers. Empty input → all pages. */
export function parseRanges(input: string, totalPages: number, { allowEmpty = false } = {}): number[] {
  const cleaned = input.trim().replace(/\s+/g, '');
  if (!cleaned) {
    if (allowEmpty) return Array.from({ length: totalPages }, (_, i) => i + 1);
    throw new Error('Enter at least one page or range (e.g. 1-5, 12, 18-22).');
  }
  const out = new Set<number>();
  for (const part of cleaned.split(',').filter(Boolean)) {
    const [a, b] = parseRange(part, totalPages);
    for (let i = a; i <= b; i++) out.add(i);
  }
  return Array.from(out).sort((a, b) => a - b);
}

/** Parse a single "12" or "12-20" into [start, end], validated against totalPages. */
export function parseRange(part: string, totalPages: number): [number, number] {
  if (/^\d+$/.test(part)) {
    const n = parseInt(part, 10);
    if (n < 1 || n > totalPages) throw new Error(`Page ${n} is out of range (1–${totalPages}).`);
    return [n, n];
  }
  const m = part.match(/^(\d+)-(\d+)$/);
  if (!m) throw new Error(`Cannot read "${part}". Use formats like 1-5, 12, 18-22.`);
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a < 1 || b > totalPages || a > b) throw new Error(`Range ${a}-${b} is invalid (PDF has ${totalPages} pages).`);
  return [a, b];
}

export type RenderedPage = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Page size in PDF points (1/72 in). */
  widthPt: number;
  heightPt: number;
  pageNumber: number;
};

/**
 * Render selected pages of a PDF to canvases one at a time (keeps memory flat
 * for 500-page files). `pages` are 1-based; omit for all pages.
 */
export async function forEachRenderedPage(
  data: ArrayBuffer,
  dpi: number,
  onPage: (page: RenderedPage, index: number, total: number) => Promise<void>,
  pages?: number[]
): Promise<number> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data }).promise;
  const list = pages ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Your browser could not create a drawing canvas.');

  for (let i = 0; i < list.length; i++) {
    const page = await doc.getPage(list[i]);
    const base = page.getViewport({ scale: 1 });
    // iOS Safari refuses canvases above ~16.7M pixels; cap the scale so
    // huge pages or high DPI never produce a blank page.
    const MAX_PIXELS = 14_000_000;
    let scale = dpi / 72;
    const area = base.width * base.height * scale * scale;
    if (area > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / area);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    await onPage({ canvas, ctx, widthPt: base.width, heightPt: base.height, pageNumber: list[i] }, i, list.length);
    page.cleanup();
  }
  const n = doc.numPages;
  await doc.destroy();
  return n;
}

export async function pageCount(data: ArrayBuffer): Promise<number> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  return doc.getPageCount();
}

export function canvasToBytes(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality = 0.85): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error('Could not encode image.'))),
      type,
      quality
    );
  });
}

/** Zip several files and download; a single file downloads as-is. */
export async function downloadMany(files: { name: string; data: Uint8Array; type: string }[], zipName: string) {
  if (files.length === 1) {
    downloadBlob(new Blob([files[0].data as BlobPart], { type: files[0].type }), files[0].name);
    return;
  }
  const { zipSync } = await import('fflate');
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of files) entries[f.name] = [f.data, { level: 0 }];
  downloadBlob(new Blob([zipSync(entries) as BlobPart], { type: 'application/zip' }), zipName);
}
