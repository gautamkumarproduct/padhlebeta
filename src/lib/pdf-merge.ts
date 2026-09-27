/**
 * Merge multiple PDFs into one, in the order given.
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, _opts, statusEl) => {
  if (files.length < 2) throw new Error('Choose at least two PDFs to merge.');

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDFs…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    progressBar(statusEl, (i / files.length) * 90, `Merging ${files[i].name}…`);
    const src = await PDFDocument.load(await files[i].arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }

  progressBar(statusEl, 95, 'Saving merged PDF…');
  const bytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), 'merged.pdf');
  return `Done! Merged ${files.length} files into ${out.getPageCount()} pages.`;
};
