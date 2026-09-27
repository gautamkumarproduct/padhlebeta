/**
 * Split one PDF into several: by ranges, every N pages, or one file per page.
 * Multiple outputs download as a ZIP.
 */

import { getPdfLib, downloadMany, progressBar, baseName, num, parseRange, type ToolRunner } from './pdf-runtime';

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();

  let groups: [number, number][];
  if (opts.mode === 'each') {
    groups = Array.from({ length: total }, (_, i) => [i + 1, i + 1]);
  } else if (opts.mode === 'every') {
    const n = Math.max(1, Math.floor(num(opts.every, 10)));
    groups = [];
    for (let a = 1; a <= total; a += n) groups.push([a, Math.min(total, a + n - 1)]);
  } else {
    const text = String(opts.ranges ?? '').replace(/\s+/g, '');
    if (!text) throw new Error('Enter the ranges to split into, e.g. 1-40, 41-95.');
    groups = text.split(',').filter(Boolean).map((part) => parseRange(part, total));
  }

  const name = baseName(file);
  const outputs: { name: string; data: Uint8Array; type: string }[] = [];
  for (let g = 0; g < groups.length; g++) {
    const [a, b] = groups[g];
    progressBar(statusEl, (g / groups.length) * 90, `Creating part ${g + 1} of ${groups.length}…`);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
    pages.forEach((p) => out.addPage(p));
    const label = a === b ? `p${a}` : `p${a}-${b}`;
    outputs.push({ name: `${name}-${label}.pdf`, data: await out.save(), type: 'application/pdf' });
  }

  progressBar(statusEl, 95, 'Packing ZIP…');
  await downloadMany(outputs, `${name}-split.zip`);
  progressBar(statusEl, 100, 'Done!');
  return `Done! Split into ${outputs.length} file${outputs.length === 1 ? '' : 's'}.`;
};
