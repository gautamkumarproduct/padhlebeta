/**
 * Image → PDF.
 * Each image becomes one A4 page, fit-to-page with margins.
 */

import { getPdfLib, downloadBlob, progressBar } from './pdf-runtime';

const A4_WIDTH = 595.28;   // 8.27 in × 72
const A4_HEIGHT = 841.89;  // 11.69 in × 72
const MARGIN = 36;          // 0.5 inch

export async function runImageToPdf(
  files: File[],
  statusEl: HTMLElement,
  downloadName = 'padhlebeta-images.pdf'
): Promise<void> {
  if (files.length === 0) throw new Error('Drop at least one image.');

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading images…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    progressBar(statusEl, (i / files.length) * 90, `Embedding ${files[i].name}…`);
    const bytes = new Uint8Array(await files[i].arrayBuffer());
    let img;
    try {
      img = await out.embedJpg(bytes);
    } catch {
      try {
        img = await out.embedPng(bytes);
      } catch (err) {
        throw new Error(`${files[i].name} is not a supported image (JPG, PNG, or HEIC).`);
      }
    }

    const page = out.addPage([A4_WIDTH, A4_HEIGHT]);
    const maxW = A4_WIDTH - MARGIN * 2;
    const maxH = A4_HEIGHT - MARGIN * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    page.drawImage(img, {
      x: (A4_WIDTH - w) / 2,
      y: (A4_HEIGHT - h) / 2,
      width: w,
      height: h,
    });
  }

  progressBar(statusEl, 95, 'Saving PDF…');
  const outBytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), downloadName);
}
