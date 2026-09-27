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

export type GridOptions = {
  cols: number;
  rows: number;
  orientation?: 'auto' | 'portrait' | 'landscape';
  marginMm?: number;
  gapMm?: number;
  border?: boolean;
  onProgress?: (pct: number) => void;
};

/** Lay out the pages of `srcBytes` on A4 sheets in a cols × rows grid (reading order). */
export async function nUpGrid(srcBytes: ArrayBuffer | Uint8Array, o: GridOptions): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await getPdfLib();
  const out = await PDFDocument.create();
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const { cols, rows } = o;
  const perSheet = cols * rows;
  const margin = (o.marginMm ?? 8) * MM_TO_PT;
  const gap = (o.gapMm ?? 2) * MM_TO_PT;
  const first = embedded[0];

  const fit = (sheet: [number, number]) => {
    const cellW = (sheet[0] - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = (sheet[1] - margin * 2 - gap * (rows - 1)) / rows;
    return { cellW, cellH, scale: Math.min(cellW / first.width, cellH / first.height) };
  };
  const portrait = A4;
  const landscape: [number, number] = [A4[1], A4[0]];
  const sheet =
    o.orientation === 'portrait' ? portrait
    : o.orientation === 'landscape' ? landscape
    : fit(landscape).scale > fit(portrait).scale ? landscape : portrait;
  const { cellW, cellH } = fit(sheet);

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
    if (o.border) page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
    o.onProgress?.((i + 1) / embedded.length);
  });
  return out.save();
}

/** Lay out the pages of `srcBytes` N-up and return the new PDF bytes. */
export async function nUp(
  srcBytes: ArrayBuffer | Uint8Array,
  perSheet: number,
  { marginMm = 8, border = true, onProgress }: { marginMm?: number; border?: boolean; onProgress?: (pct: number) => void } = {}
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const first = src.getPage(0);
  const { width, height } = first.getSize();
  const layout = bestLayout(perSheet, width, height, marginMm * MM_TO_PT, 6);
  return nUpGrid(srcBytes, { cols: layout.cols, rows: layout.rows, orientation: layout.sheet[0] > layout.sheet[1] ? 'landscape' : 'portrait', marginMm, gapMm: 6 / MM_TO_PT, border, onProgress });
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
