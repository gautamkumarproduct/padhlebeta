/**
 * PDF pages → JPG/PNG images. Several pages download as a ZIP.
 */

import { forEachRenderedPage, canvasToBytes, downloadMany, progressBar, baseName, num, parseRanges, pageCount, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const data = await file.arrayBuffer();
  const total = await pageCount(data.slice(0));
  const pages = parseRanges(String(opts.pages ?? ''), total, { allowEmpty: true });
  const png = opts.format === 'png';
  const name = baseName(file);
  const outputs: { name: string; data: Uint8Array; type: string }[] = [];

  await forEachRenderedPage(data, num(opts.dpi, 150), async (pg, i, count) => {
    progressBar(statusEl, (i / count) * 90, `Rendering page ${pg.pageNumber} (${i + 1} of ${count})…`);
    outputs.push({
      name: `${name}-page-${pg.pageNumber}.${png ? 'png' : 'jpg'}`,
      data: await canvasToBytes(pg.canvas, png ? 'image/png' : 'image/jpeg', 0.9),
      type: png ? 'image/png' : 'image/jpeg',
    });
  }, pages);

  progressBar(statusEl, 95, outputs.length > 1 ? 'Packing ZIP…' : 'Saving…');
  await downloadMany(outputs, `${name}-images.zip`);
  progressBar(statusEl, 100, 'Done!');
  return `Done! Converted ${outputs.length} page${outputs.length === 1 ? '' : 's'}.`;
};
