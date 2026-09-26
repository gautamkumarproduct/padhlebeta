/**
 * Dark PDF → Light PDF
 *
 * Approach: render every page of the source PDF to a high-DPI canvas,
 * apply a per-pixel colour inversion, then embed each inverted canvas
 * as a JPEG into a brand-new PDF. The result preserves layout and
 * is far cheaper to print (white background, dark content).
 *
 * Trade-off: the output is image-based and not text-searchable. For
 * printed coaching notes this is fine.
 */

import { getPdfJs, getPdfLib, downloadBlob, progressBar } from './pdf-runtime';

const TARGET_DPI = 144; // print-quality balance between sharpness and file size

export async function runDarkToLight(
  file: File,
  statusEl: HTMLElement,
  downloadName?: string
): Promise<void> {
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const pdfjs = await getPdfJs();
  const { PDFDocument, rgb } = await getPdfLib();

  const buf = await file.arrayBuffer();
  const src = await pdfjs.getDocument({ data: buf }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i++) {
    progressBar(statusEl, (i - 1) / src.numPages * 90, `Converting page ${i} of ${src.numPages}…`);

    const page = await src.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = TARGET_DPI / 72; // PDF native is 72 DPI
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Fill white first (PDF.js renders transparent background by default)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;

    // Per-pixel colour inversion
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      // Skip fully-transparent pixels
      if (d[p + 3] === 0) continue;
      d[p] = 255 - d[p];
      d[p + 1] = 255 - d[p + 1];
      d[p + 2] = 255 - d[p + 2];
    }
    ctx.putImageData(img, 0, 0);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88));
    if (!blob) throw new Error('Could not encode page');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const jpg = await out.embedJpg(bytes);

    const newPage = out.addPage([baseViewport.width, baseViewport.height]);
    newPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    // Hint for accessibility / future-proofing (cosmetic — page has no text)
    void rgb; // silence unused
    page.cleanup();
  }

  progressBar(statusEl, 95, 'Saving PDF…');
  const outBytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(
    new Blob([outBytes], { type: 'application/pdf' }),
    downloadName ?? `padhlebeta-light-${file.name.replace(/\.pdf$/i, '')}.pdf`
  );
}
