/**
 * Compress a PDF.
 *  - lossless: strip metadata and repack with object streams.
 *  - balanced / strong: re-render pages as JPEG at a lower resolution.
 *    Big wins on scanned and image-heavy slides; text becomes image.
 * If a lossy result is not actually smaller, the lossless one is used.
 */

import { getPdfLib, forEachRenderedPage, canvasToBytes, downloadBlob, progressBar, pdfBlob, baseName, formatBytes, type ToolRunner } from './pdf-runtime';

const LEVELS = {
  balanced: { dpi: 110, quality: 0.7 },
  strong: { dpi: 84, quality: 0.5 },
} as const;

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const data = await file.arrayBuffer();

  const src = await PDFDocument.load(data.slice(0), { ignoreEncryption: true, updateMetadata: false });
  src.setProducer('Padhle Beta');
  src.setCreator('Padhle Beta');
  let bytes = await src.save({ useObjectStreams: true });

  const level = LEVELS[opts.level as keyof typeof LEVELS];
  if (level) {
    const out = await PDFDocument.create();
    await forEachRenderedPage(data, level.dpi, async (pg, i, total) => {
      progressBar(statusEl, (i / total) * 90, `Compressing page ${i + 1} of ${total}…`);
      const jpg = await out.embedJpg(await canvasToBytes(pg.canvas, 'image/jpeg', level.quality));
      out.addPage([pg.widthPt, pg.heightPt]).drawImage(jpg, { x: 0, y: 0, width: pg.widthPt, height: pg.heightPt });
    });
    const lossy = await out.save({ useObjectStreams: true });
    if (lossy.length < bytes.length) bytes = lossy;
  }

  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-compressed.pdf`);
  const saved = Math.max(0, 1 - bytes.length / file.size);
  if (saved < 0.05) {
    return `This PDF is already well optimised (${formatBytes(file.size)}). ${opts.level === 'strong' ? 'To go smaller, extract only the pages you need first.' : 'Try the “Strong” level, or extract only the pages you need.'}`;
  }
  return `Done! ${formatBytes(file.size)} → ${formatBytes(bytes.length)} (${Math.round(saved * 100)}% smaller).`;
};
