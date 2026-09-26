/**
 * Merge multiple PDFs into one, preserving page order.
 */

import { getPdfLib, downloadBlob, progressBar } from './pdf-runtime';

export async function runMerge(
  files: File[],
  statusEl: HTMLElement,
  downloadName = 'padhlebeta-merged.pdf'
): Promise<void> {
  if (files.length < 2) {
    throw new Error('Drop at least two PDFs to merge.');
  }

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDFs…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    progressBar(statusEl, (i / files.length) * 90, `Merging ${files[i].name}…`);
    const bytes = await files[i].arrayBuffer();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }

  progressBar(statusEl, 95, 'Saving merged PDF…');
  const outBytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), downloadName);
}
