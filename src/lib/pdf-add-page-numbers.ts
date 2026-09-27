/**
 * Stamp page numbers onto every page.
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, num, type ToolRunner } from './pdf-runtime';

function label(format: string, n: number, total: number): string {
  switch (format) {
    case 'page-n': return `Page ${n}`;
    case 'n-of-total': return `${n} / ${total}`;
    case 'page-n-of-total': return `Page ${n} of ${total}`;
    default: return String(n);
  }
}

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 10, 'Loading PDF…');

  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = num(opts.size, 11);
  const start = Math.floor(num(opts.start, 1));
  const position = String(opts.position ?? 'bottom-center');
  const format = String(opts.format ?? 'n');
  const pages = doc.getPages();
  const lastNumber = start + pages.length - 1;
  const pad = 22;

  pages.forEach((page, i) => {
    const text = label(format, start + i, lastNumber);
    const box = page.getCropBox();
    const w = font.widthOfTextAtSize(text, size);
    const x = position.endsWith('left')
      ? box.x + pad
      : position.endsWith('right')
        ? box.x + box.width - pad - w
        : box.x + (box.width - w) / 2;
    const y = position.startsWith('top') ? box.y + box.height - pad - size : box.y + pad;
    page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
  });

  progressBar(statusEl, 80, 'Saving PDF…');
  const bytes = await doc.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-numbered.pdf`);
};
