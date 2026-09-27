/**
 * Dark PDF → Light PDF.
 *
 * Renders each page, measures it, inverts dark pages (auto) or all pages,
 * optionally whitens grey haze and drops colour, then rebuilds a PDF of
 * JPEG pages. Optionally lays the result out N-up.
 *
 * Trade-off: output is image-based (not text-searchable). For printing
 * coaching notes that is fine.
 */

import { getPdfLib, forEachRenderedPage, canvasToBytes, downloadBlob, progressBar, pdfBlob, baseName, num, type ToolRunner } from './pdf-runtime';
import { meanLuminance, transformPixels } from './pdf-pixels';
import { nUp } from './pdf-pages-per-sheet';

/** Pages darker than this (mean luminance 0–255) count as "dark". */
const DARK_THRESHOLD = 110;

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  const dpi = num(opts.quality, 150);
  const perSheet = num(opts.perSheet, 1);
  const fitA4 = opts.paper !== 'original';
  const invertAll = opts.mode === 'all';
  const clean = opts.clean !== false;
  const grayscale = opts.grayscale === true;

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  let inverted = 0;

  await forEachRenderedPage(await file.arrayBuffer(), dpi, async (pg, i, total) => {
    progressBar(statusEl, (i / total) * (perSheet > 1 ? 80 : 92), `Converting page ${i + 1} of ${total}…`);
    const img = pg.ctx.getImageData(0, 0, pg.canvas.width, pg.canvas.height);
    const invert = invertAll || meanLuminance(img) < DARK_THRESHOLD;
    if (invert) inverted++;
    // Only whiten pages we inverted, so light pages with shaded boxes stay as designed.
    transformPixels(img, { invert, grayscale, whitePoint: clean && invert ? 215 : 0 });
    pg.ctx.putImageData(img, 0, 0);
    const jpg = await out.embedJpg(await canvasToBytes(pg.canvas, 'image/jpeg', 0.85));
    out.addPage([pg.widthPt, pg.heightPt]).drawImage(jpg, { x: 0, y: 0, width: pg.widthPt, height: pg.heightPt });
  });

  progressBar(statusEl, 92, 'Saving PDF…');
  let bytes = await out.save();
  if (perSheet > 1 || fitA4) {
    progressBar(statusEl, 94, perSheet > 1 ? `Placing ${perSheet} slides per A4 sheet…` : 'Fitting pages to A4…');
    bytes = await nUp(bytes, perSheet, { border: perSheet > 1, marginMm: perSheet > 1 ? 8 : 6 });
  }
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-light.pdf`);
  const total = out.getPageCount();
  return `Done! Inverted ${inverted} of ${total} pages${perSheet > 1 ? `, ${perSheet} per A4 sheet` : fitA4 ? ', fitted to A4' : ''}. Your download has started.`;
};
