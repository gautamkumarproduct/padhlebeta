/**
 * Images → PDF. JPG/PNG embed directly; other formats (WebP, GIF, BMP)
 * are re-encoded through a canvas first.
 */

import { getPdfLib, canvasToBytes, downloadBlob, progressBar, pdfBlob, type ToolRunner } from './pdf-runtime';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 36;

async function toJpeg(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name} could not be read. Use JPG, PNG or WebP.`);
  });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return canvasToBytes(canvas, 'image/jpeg', 0.9);
}

export const run: ToolRunner = async (files, opts, statusEl) => {
  if (files.length === 0) throw new Error('Choose at least one image.');

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading images…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  const fitA4 = opts.fit !== 'original';

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    progressBar(statusEl, (i / files.length) * 90, `Adding ${f.name}…`);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const img =
      f.type === 'image/png' ? await out.embedPng(bytes)
      : f.type === 'image/jpeg' ? await out.embedJpg(bytes)
      : await out.embedJpg(await toJpeg(f));

    if (fitA4) {
      const page = out.addPage([A4_WIDTH, A4_HEIGHT]);
      const ratio = Math.min((A4_WIDTH - MARGIN * 2) / img.width, (A4_HEIGHT - MARGIN * 2) / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      page.drawImage(img, { x: (A4_WIDTH - w) / 2, y: (A4_HEIGHT - h) / 2, width: w, height: h });
    } else {
      // Treat image pixels as 96 DPI.
      const w = (img.width * 72) / 96;
      const h = (img.height * 72) / 96;
      out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
    }
  }

  progressBar(statusEl, 95, 'Saving PDF…');
  const bytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), 'images.pdf');
  return `Done! Created a ${files.length}-page PDF.`;
};
