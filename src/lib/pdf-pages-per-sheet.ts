/**
 * N-up: place several pages on each A4 sheet. Pages are embedded as
 * XObjects, so vector text stays sharp.
 */

import { getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, num, MM_TO_PT, type ToolRunner } from './pdf-runtime';

const A4: [number, number] = [595.28, 841.89];

const GRIDS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[1, 2], [2, 1]],
  4: [[2, 2]],
  6: [[2, 3], [3, 2]],
  9: [[3, 3]],
};

type Layout = { sheet: [number, number]; cols: number; rows: number; scale: number };

/** Pick the grid + sheet orientation that makes pages largest. */
function bestLayout(perSheet: number, pageW: number, pageH: number, margin: number, gap: number): Layout {
  let best: Layout | null = null;
  for (const [cols, rows] of GRIDS[perSheet] ?? [[1, 1]]) {
    for (const sheet of [A4, [A4[1], A4[0]] as [number, number]]) {
      const cellW = (sheet[0] - margin * 2 - gap * (cols - 1)) / cols;
      const cellH = (sheet[1] - margin * 2 - gap * (rows - 1)) / rows;
      const scale = Math.min(cellW / pageW, cellH / pageH);
      if (!best || scale > best.scale) best = { sheet, cols, rows, scale };
    }
  }
  return best!;
}

/** Lay out the pages of `srcBytes` N-up and return the new PDF bytes. */
export async function nUp(
  srcBytes: ArrayBuffer | Uint8Array,
  perSheet: number,
  { marginMm = 8, border = true, onProgress }: { marginMm?: number; border?: boolean; onProgress?: (pct: number) => void } = {}
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await getPdfLib();
  const out = await PDFDocument.create();
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const indices = src.getPageIndices();
  const embedded = await out.embedPdf(src, indices);

  const margin = marginMm * MM_TO_PT;
  const gap = 6;
  const first = embedded[0];
  const layout = bestLayout(perSheet, first.width, first.height, margin, gap);
  const { sheet, cols, rows } = layout;
  const cellW = (sheet[0] - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = (sheet[1] - margin * 2 - gap * (rows - 1)) / rows;

  let page = out.addPage(sheet);
  embedded.forEach((ep, i) => {
    const slot = i % perSheet;
    if (i > 0 && slot === 0) page = out.addPage(sheet);
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const scale = Math.min(cellW / ep.width, cellH / ep.height);
    const w = ep.width * scale;
    const h = ep.height * scale;
    const x = margin + col * (cellW + gap) + (cellW - w) / 2;
    const y = sheet[1] - margin - (row + 1) * cellH - row * gap + (cellH - h) / 2;
    page.drawPage(ep, { x, y, width: w, height: h });
    if (border) {
      page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
    }
    onProgress?.((i + 1) / embedded.length);
  });

  return out.save();
}

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 5, 'Loading PDF…');
  const perSheet = num(opts.perSheet, 4);
  const bytes = await nUp(await file.arrayBuffer(), perSheet, {
    marginMm: num(opts.margin, 8),
    border: opts.border !== false,
    onProgress: (f) => progressBar(statusEl, 5 + f * 85, 'Arranging pages…'),
  });
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-${perSheet}-per-sheet.pdf`);
};
