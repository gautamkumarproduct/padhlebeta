/**
 * Colour PDF → grayscale, by rendering and re-encoding each page.
 */

import { getPdfLib, forEachRenderedPage, canvasToBytes, downloadBlob, progressBar, pdfBlob, baseName, num, type ToolRunner } from './pdf-runtime';
import { transformPixels } from './pdf-pixels';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  await forEachRenderedPage(await file.arrayBuffer(), num(opts.quality, 150), async (pg, i, total) => {
    progressBar(statusEl, (i / total) * 92, `Converting page ${i + 1} of ${total}…`);
    const img = pg.ctx.getImageData(0, 0, pg.canvas.width, pg.canvas.height);
    transformPixels(img, { grayscale: true, whitePoint: opts.clean !== false ? 235 : 0 });
    pg.ctx.putImageData(img, 0, 0);
    const jpg = await out.embedJpg(await canvasToBytes(pg.canvas, 'image/jpeg', 0.85));
    out.addPage([pg.widthPt, pg.heightPt]).drawImage(jpg, { x: 0, y: 0, width: pg.widthPt, height: pg.heightPt });
  });

  progressBar(statusEl, 95, 'Saving PDF…');
  const bytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-grayscale.pdf`);
};
