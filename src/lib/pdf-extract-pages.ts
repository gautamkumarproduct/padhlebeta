/**
 * Extract pages from a PDF.
 * Range syntax: comma-separated, e.g. "1-5, 10, 15-20".
 */

import { getPdfLib, downloadBlob, progressBar } from './pdf-runtime';

export function parseRanges(input: string, totalPages: number): number[] {
  const cleaned = input.trim().replace(/\s+/g, '');
  if (!cleaned) throw new Error('Enter at least one page or range (e.g. 1-5, 12, 18-22).');

  const out = new Set<number>();
  cleaned.split(',').forEach((part) => {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > totalPages) throw new Error(`Page ${n} is out of range (1–${totalPages}).`);
      out.add(n);
    } else {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (!m) throw new Error(`Cannot parse "${part}". Use formats like 1-5, 12, 18-22.`);
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (a < 1 || b > totalPages || a > b) throw new Error(`Range ${a}-${b} is invalid.`);
      for (let i = a; i <= b; i++) out.add(i);
    }
  });
  return Array.from(out).sort((a, b) => a - b);
}

export async function runExtract(
  file: File,
  rangesInput: string,
  statusEl: HTMLElement,
  downloadName?: string
): Promise<void> {
  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 0, 'Loading PDF…');

  const { PDFDocument } = await getPdfLib();
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = src.getPageCount();

  const indices = parseRanges(rangesInput, totalPages).map((n) => n - 1);
  progressBar(statusEl, 30, `Extracting ${indices.length} of ${totalPages} pages…`);

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));

  progressBar(statusEl, 90, 'Saving PDF…');
  const outBytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(
    new Blob([outBytes], { type: 'application/pdf' }),
    downloadName ?? `padhlebeta-extracted-${file.name.replace(/\.pdf$/i, '')}.pdf`
  );
}
