/**
 * Rotate all or selected pages; rotation is stored in the page dictionary (lossless).
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, num, parseRanges, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 10, 'Loading PDF…');

  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pages = doc.getPages();
  const selected = parseRanges(String(opts.pages ?? ''), pages.length, { allowEmpty: true });
  const angle = num(opts.angle, 90);
  for (const n of selected) {
    const p = pages[n - 1];
    p.setRotation(degrees((p.getRotation().angle + angle) % 360));
  }

  progressBar(statusEl, 80, 'Saving PDF…');
  const bytes = await doc.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-rotated.pdf`);
  return `Done! Rotated ${selected.length} page${selected.length === 1 ? '' : 's'}.`;
};
