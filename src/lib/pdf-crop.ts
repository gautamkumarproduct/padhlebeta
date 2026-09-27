/**
 * Crop page margins by shrinking the CropBox (lossless).
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, num, parseRanges, MM_TO_PT, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 10, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pages = doc.getPages();
  const selected = parseRanges(String(opts.pages ?? ''), pages.length, { allowEmpty: true });
  const [top, bottom, left, right] = ['top', 'bottom', 'left', 'right'].map((k) => Math.max(0, num(opts[k], 0)) * MM_TO_PT);

  for (const n of selected) {
    const p = pages[n - 1];
    const box = p.getCropBox();
    const w = box.width - left - right;
    const h = box.height - top - bottom;
    if (w < 36 || h < 36) throw new Error(`Those margins are larger than page ${n}. Try smaller values.`);
    p.setCropBox(box.x + left, box.y + bottom, w, h);
  }

  progressBar(statusEl, 80, 'Saving PDF…');
  const bytes = await doc.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-cropped.pdf`);
};
