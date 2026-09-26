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
      // Use a CDN worker that matches the bundled version. Pinning to the
      // bundled version prevents version-mismatch crashes.
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
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
