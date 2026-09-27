/**
 * Organise PDF: thumbnail grid with reorder (drag or arrow buttons), rotate
 * and delete. `mount` builds the UI; the tool form passes the resulting
 * page plan to `run` as JSON in `opts.plan`.
 */

import { getPdfJs, getPdfLib, downloadBlob, progressBar, pdfBlob, baseName, type ToolRunner } from './pdf-runtime';

type PagePlan = { index: number; rotation: number; deleted: boolean };

const THUMB_WIDTH = 150;

export async function mount(container: HTMLElement, file: File): Promise<() => PagePlan[]> {
  container.innerHTML = '<p class="organizer__loading">Loading pages…</p>';
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const plan: PagePlan[] = Array.from({ length: doc.numPages }, (_, i) => ({ index: i, rotation: 0, deleted: false }));
  const thumbs = new Map<number, HTMLCanvasElement>();

  const grid = document.createElement('ol');
  grid.className = 'organizer';
  grid.setAttribute('role', 'list');
  container.replaceChildren(grid);

  let dragFrom = -1;

  function render() {
    grid.replaceChildren(
      ...plan.map((p, pos) => {
        const li = document.createElement('li');
        li.className = 'organizer__page' + (p.deleted ? ' is-deleted' : '');
        li.draggable = true;
        li.dataset.pos = String(pos);
        const frame = document.createElement('div');
        frame.className = 'organizer__thumb';
        const canvas = thumbs.get(p.index);
        if (canvas) {
          canvas.style.transform = `rotate(${p.rotation}deg)`;
          frame.append(canvas);
        }
        const label = document.createElement('span');
        label.className = 'organizer__label';
        label.textContent = `Page ${p.index + 1}`;
        const bar = document.createElement('div');
        bar.className = 'organizer__bar';
        const btn = (text: string, title: string, fn: () => void) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = text;
          b.title = title;
          b.setAttribute('aria-label', `${title} page ${p.index + 1}`);
          b.addEventListener('click', () => { fn(); render(); });
          return b;
        };
        bar.append(
          btn('←', 'Move left', () => pos > 0 && plan.splice(pos - 1, 0, ...plan.splice(pos, 1))),
          btn('⟳', 'Rotate', () => (p.rotation = (p.rotation + 90) % 360)),
          btn(p.deleted ? '↺' : '✕', p.deleted ? 'Restore' : 'Delete', () => (p.deleted = !p.deleted)),
          btn('→', 'Move right', () => pos < plan.length - 1 && plan.splice(pos + 1, 0, ...plan.splice(pos, 1))),
        );
        li.append(frame, label, bar);
        li.addEventListener('dragstart', () => { dragFrom = pos; li.classList.add('is-dragging'); });
        li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
        li.addEventListener('dragover', (e) => e.preventDefault());
        li.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragFrom < 0 || dragFrom === pos) return;
          plan.splice(pos, 0, ...plan.splice(dragFrom, 1));
          dragFrom = -1;
          render();
        });
        return li;
      })
    );
  }

  render();
  // Render thumbnails progressively so large PDFs show up quickly.
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: THUMB_WIDTH / vp1.width });
    const c = document.createElement('canvas');
    c.width = Math.ceil(vp.width);
    c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    thumbs.set(i, c);
    const pos = plan.findIndex((p) => p.index === i);
    const frame = grid.children[pos]?.querySelector('.organizer__thumb');
    if (frame) {
      c.style.transform = `rotate(${plan[pos].rotation}deg)`;
      frame.replaceChildren(c);
    }
    page.cleanup();
  }

  return () => plan.map((p) => ({ ...p }));
}

export const run: ToolRunner = async (files, opts, statusEl) => {
  const file = files[0];
  const plan: PagePlan[] = JSON.parse(String(opts.plan || '[]'));
  const keep = plan.filter((p) => !p.deleted);
  if (plan.length && keep.length === 0) throw new Error('You deleted every page. Restore at least one.');

  statusEl.classList.remove('is-hidden');
  progressBar(statusEl, 10, 'Loading PDF…');
  const { PDFDocument, degrees } = await getPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const order = plan.length ? keep : src.getPageIndices().map((index) => ({ index, rotation: 0, deleted: false }));

  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, order.map((p) => p.index));
  pages.forEach((page, i) => {
    if (order[i].rotation) page.setRotation(degrees((page.getRotation().angle + order[i].rotation) % 360));
    out.addPage(page);
  });

  progressBar(statusEl, 85, 'Saving PDF…');
  const bytes = await out.save();
  progressBar(statusEl, 100, 'Done!');
  downloadBlob(pdfBlob(bytes), `${baseName(file)}-organised.pdf`);
  return `Done! Saved ${order.length} of ${src.getPageCount()} pages.`;
};
