/**
 * Extract selected pages into a new PDF.
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, parseRanges, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const indices = parseRanges(String(opts.ranges ?? ''), total).map((n) => n - 1);
  progressBar(statusEl, 30, `Extracting ${indices.length} of ${total} pages…`);

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));

  progressBar(statusEl, 90, 'Saving PDF…');
  const bytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-extracted.pdf`);
  return `Done! Extracted ${indices.length} of ${total} pages.`;
};
