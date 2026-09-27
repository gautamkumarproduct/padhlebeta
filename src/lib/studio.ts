/**
 * Converter studio: the interactive dark-notes → printable PDF editor.
 * Markup lives in ConverterStudio.astro; this wires it up.
 *
 * Model: a list of pages (from one or more PDFs) with include / invert flags,
 * a Settings object, and cached original renders. The preview and the
 * thumbnails re-apply the enhancement pipeline to cached pixels, so tweaking
 * a slider never re-renders the PDF. Export renders each page at print DPI.
 */

import { getPdfJs, getPdfLib, canvasToBytes, downloadBlob } from './pdf-runtime';
import { applyEnhance, meanLuminance, type Enhance } from './pdf-pixels';
import { nUpGrid } from './pdf-pages-per-sheet';

type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof getPdfJs>>['getDocument']>['promise']>;

type Page = {
  id: number;
  doc: PdfDoc;
  pageNo: number;
  widthPt: number;
  heightPt: number;
  include: boolean;
  dark: boolean;
  /** Used when invert mode is "custom". */
  invert: boolean;
  thumb?: ImageData;
  thumbCanvas: HTMLCanvasElement;
};

type Settings = Omit<Enhance, 'invert'> & {
  invertMode: 'auto' | 'all' | 'custom' | 'off';
  cols: number;
  rows: number;
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number;
  gap: number;
  border: boolean;
  paper: 'a4' | 'original';
  quality: number;
  eraseOn: boolean;
  /** Set when the grid came from a "slides per page" preset; re-optimised on orientation/page changes. */
  perPage: number | null;
};

const DEFAULT_ENHANCE = { forceWhite: true, grayscale: false, brightness: 100, contrast: 110, sharpen: 25, eraseTop: 8, eraseBottom: 6, eraseOn: false };
const DARK_THRESHOLD = 110;
const THUMB_W = 240;
const A4: [number, number] = [595.28, 841.89];
const MM = 72 / 25.4;

export function mountStudio(root: HTMLElement) {
  // The editor is moved to <body> below, so look up elements in both places.
  const wsEl = root.querySelector<HTMLElement>('[data-cs-ws]')!;
  const $ = <T extends Element = HTMLElement>(sel: string) => (root.querySelector<T>(sel) ?? wsEl.querySelector<T>(sel))!;
  const $$ = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel), ...(wsEl.parentElement !== root ? wsEl.querySelectorAll<T>(sel) : [])];

  const init = JSON.parse(root.dataset.init || '{}');
  const s: Settings = {
    invertMode: init.invertMode ?? 'auto',
    ...DEFAULT_ENHANCE,
    grayscale: Boolean(init.grayscale),
    cols: 1,
    rows: 1,
    perPage: init.perPage ?? 1,
    orientation: 'auto',
    margin: 10,
    gap: 3,
    border: true,
    paper: init.paper ?? 'a4',
    quality: 150,
  };

  const drop = $('[data-cs-drop]');
  const dropErr = $('[data-cs-drop-error]');
  const input = $<HTMLInputElement>('[data-cs-input]');
  const addInput = $<HTMLInputElement>('[data-cs-add]');
  const ws = $('[data-cs-ws]');
  // Portal the full-screen editor to <body> so no transformed/animated
  // ancestor can trap its position: fixed.
  document.body.appendChild(ws);
  const thumbsEl = $<HTMLOListElement>('[data-cs-thumbs]');
  const preview = $<HTMLCanvasElement>('[data-cs-preview]');
  const previewWrap = $('[data-cs-preview-wrap]');
  const previewLabel = $('[data-cs-preview-label]');
  const busy = $('[data-cs-busy]');
  const busyBar = $('[data-cs-busy-bar]');
  const busyText = $('[data-cs-busy-text]');
  const done = $('[data-cs-done]');
  const filenameInput = $<HTMLInputElement>('[data-cs-filename]');

  let pages: Page[] = [];
  let nextId = 1;
  let current = 0; // index into pages
  let view: 'page' | 'sheet' = 'page';
  let showOriginal = false;
  let previewCache: { id: number; img: ImageData } | null = null;
  let lastDownload: { blob: Blob; name: string } | null = null;
  let baseName = 'notes';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- helpers ----------
  const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const invertFor = (p: Page) =>
    s.invertMode === 'all' ? true : s.invertMode === 'off' ? false : s.invertMode === 'custom' ? p.invert : p.dark;
  const enhanceFor = (p: Page, forThumb = false): Enhance => ({
    invert: invertFor(p),
    grayscale: s.grayscale,
    forceWhite: s.forceWhite,
    brightness: s.brightness,
    contrast: s.contrast,
    sharpen: forThumb ? 0 : s.sharpen,
    eraseTop: s.eraseOn ? s.eraseTop : 0,
    eraseBottom: s.eraseOn ? s.eraseBottom : 0,
  });
  const included = () => pages.filter((p) => p.include);
  const perSheet = () => s.cols * s.rows;
  const cloneImg = (img: ImageData) => new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);

  async function renderToImage(p: Page, targetWidthPx: number): Promise<ImageData> {
    const page = await p.doc.getPage(p.pageNo);
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: targetWidthPx / vp1.width });
    const c = document.createElement('canvas');
    c.width = Math.ceil(vp.width);
    c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();
    return ctx.getImageData(0, 0, c.width, c.height);
  }

  function drawImage(canvas: HTMLCanvasElement, img: ImageData) {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(img, 0, 0);
  }

  // ---------- loading ----------
  async function addFiles(files: File[], replace: boolean) {
    const pdfs = files.filter(isPdf);
    dropErr.hidden = true;
    if (!pdfs.length) {
      dropErr.textContent = files.length ? `“${files[0].name}” isn’t a PDF. Choose a .pdf file — photos of notes? Use Image to PDF first.` : '';
      dropErr.hidden = !files.length;
      return;
    }
    if (replace) {
      pages = [];
      current = 0;
      previewCache = null;
      baseName = pdfs[0].name.replace(/\.pdf$/i, '') || 'notes';
      filenameInput.value = `${baseName}-print-ready`;
    }
    openWorkspace();
    showBusy('Reading your PDF…', 'loading');
    const pdfjs = await getPdfJs();
    const fresh: Page[] = [];
    try {
      for (const f of pdfs) {
        const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let n = 1; n <= doc.numPages; n++) {
          const pg = await doc.getPage(n);
          const vp = pg.getViewport({ scale: 1 });
          const canvas = document.createElement('canvas');
          fresh.push({ id: nextId++, doc, pageNo: n, widthPt: vp.width, heightPt: vp.height, include: true, dark: false, invert: false, thumbCanvas: canvas });
        }
      }
    } catch (err: any) {
      hideBusy('loading');
      if (!pages.length) closeWorkspace();
      const msg = String(err?.message ?? '');
      dropErr.textContent = /password/i.test(msg)
        ? 'This PDF is password-protected. Open it, save a copy without the password, then try again.'
        : 'This file looks damaged or isn’t a real PDF. Try downloading it again from your coaching app.';
      dropErr.hidden = false;
      return;
    }
    pages.push(...fresh);
    buildThumbs();
    updateSummary();
    // Render thumbnails progressively; detect dark pages as we go.
    for (let i = 0; i < fresh.length; i++) {
      const p = fresh[i];
      if (busyMode === 'loading') {
        busyText.textContent = `Reading page ${i + 1} of ${fresh.length}…`;
        busyBar.style.width = `${((i + 1) / fresh.length) * 100}%`;
      }
      p.thumb = await renderToImage(p, THUMB_W);
      p.dark = meanLuminance(p.thumb) < DARK_THRESHOLD;
      p.invert = p.dark;
      paintThumb(p);
      if (i === 0) { applyPerPage(); syncControls(); updateSummary(); hideBusy('loading'); renderPreview(); }
    }
    hideBusy('loading');
    renderPreview();
    updateSummary();
  }

  // ---------- thumbnails ----------
  function buildThumbs() {
    thumbsEl.replaceChildren(
      ...pages.map((p, i) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.id = String(p.id);
        li.className = (i === current ? 'is-current ' : '') + (p.include ? '' : 'is-excluded');
        li.title = `Page ${i + 1}`;
        const inc = document.createElement('input');
        inc.type = 'checkbox';
        inc.className = 'cs-t__inc';
        inc.checked = p.include;
        inc.setAttribute('aria-label', `Include page ${i + 1}`);
        inc.addEventListener('click', (e) => e.stopPropagation());
        inc.addEventListener('change', () => { p.include = inc.checked; li.classList.toggle('is-excluded', !p.include); updateSummary(); renderPreview(); });
        const foot = document.createElement('div');
        foot.className = 'cs-t__foot';
        const label = document.createElement('span');
        label.textContent = `${i + 1}`;
        const inv = document.createElement('button');
        inv.type = 'button';
        inv.className = 'cs-t__inv';
        inv.textContent = '◐';
        inv.title = 'Invert this page';
        inv.setAttribute('aria-pressed', String(invertFor(p)));
        inv.setAttribute('aria-label', `Invert page ${i + 1}`);
        inv.addEventListener('click', (e) => {
          e.stopPropagation();
          // Any per-page choice switches the whole document to "custom".
          if (s.invertMode !== 'custom') { pages.forEach((q) => (q.invert = invertFor(q))); setInvertMode('custom'); }
          p.invert = !p.invert;
          inv.setAttribute('aria-pressed', String(p.invert));
          paintThumb(p);
          if (pages[current] === p) renderPreview();
        });
        foot.append(label, inv);
        li.append(p.thumbCanvas, inc, foot);
        li.addEventListener('click', () => { current = pages.indexOf(p); markCurrent(); renderPreview(); });
        li.addEventListener('dragstart', (e) => { li.classList.add('is-dragging'); e.dataTransfer?.setData('text/plain', String(p.id)); });
        li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
        li.addEventListener('dragover', (e) => e.preventDefault());
        li.addEventListener('drop', (e) => {
          e.preventDefault();
          const fromId = Number(e.dataTransfer?.getData('text/plain'));
          const from = pages.findIndex((q) => q.id === fromId);
          const to = pages.indexOf(p);
          if (from < 0 || from === to) return;
          const cur = pages[current];
          pages.splice(to, 0, ...pages.splice(from, 1));
          current = pages.indexOf(cur);
          buildThumbs();
          renderPreview();
        });
        return li;
      })
    );
  }

  function markCurrent() {
    Array.from(thumbsEl.children).forEach((li, i) => li.classList.toggle('is-current', i === current));
    (thumbsEl.children[current] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function paintThumb(p: Page) {
    if (!p.thumb) return;
    const img = cloneImg(p.thumb);
    applyEnhance(img, enhanceFor(p, true));
    drawImage(p.thumbCanvas, img);
    const li = thumbsEl.querySelector(`[data-id="${p.id}"] .cs-t__inv`);
    li?.setAttribute('aria-pressed', String(invertFor(p)));
  }

  let thumbJob = 0;
  function repaintAllThumbs() {
    const job = ++thumbJob;
    let i = 0;
    const step = () => {
      if (job !== thumbJob) return;
      const end = Math.min(pages.length, i + 12);
      for (; i < end; i++) paintThumb(pages[i]);
      if (i < pages.length) requestAnimationFrame(step);
      else if (view === 'sheet') renderSheet(); // sheet preview is composed from thumbnails
    };
    requestAnimationFrame(step);
  }

  // ---------- preview ----------
  let previewJob = 0;
  async function renderPreview() {
    const job = ++previewJob;
    if (!pages.length) return;
    current = Math.max(0, Math.min(current, pages.length - 1));
    if (view === 'sheet') return renderSheet();
    const p = pages[current];
    const want = Math.min(1100, Math.round(previewWrap.clientWidth * Math.min(2, devicePixelRatio || 1)));
    if (!previewCache || previewCache.id !== p.id || previewCache.img.width < want * 0.8) {
      const img = await renderToImage(p, Math.max(400, want));
      if (job !== previewJob) return;
      previewCache = { id: p.id, img };
    }
    const img = cloneImg(previewCache.img);
    if (!showOriginal) applyEnhance(img, enhanceFor(p));
    drawImage(preview, img);
    fitPreview();
    previewLabel.textContent = showOriginal
      ? 'Original'
      : `Page ${current + 1} of ${pages.length}${p.include ? '' : ' · excluded'}${invertFor(p) ? ' · inverted' : ''}`;
  }

  function sheetGeometry() {
    const first = included()[0] ?? pages[0];
    const fit = (sheet: [number, number]) => {
      const m = s.margin * MM, g = s.gap * MM;
      const cellW = (sheet[0] - m * 2 - g * (s.cols - 1)) / s.cols;
      const cellH = (sheet[1] - m * 2 - g * (s.rows - 1)) / s.rows;
      return { sheet, cellW, cellH, m, g, scale: Math.min(cellW / first.widthPt, cellH / first.heightPt) };
    };
    const portrait = fit(A4);
    const landscape = fit([A4[1], A4[0]]);
    return s.orientation === 'portrait' ? portrait : s.orientation === 'landscape' ? landscape : landscape.scale > portrait.scale ? landscape : portrait;
  }

  function renderSheet() {
    const inc = included();
    if (!inc.length) { previewLabel.textContent = 'No pages selected'; return; }
    const g = sheetGeometry();
    const scale = Math.min(1000 / g.sheet[0], 1000 / g.sheet[1]);
    preview.width = Math.round(g.sheet[0] * scale);
    preview.height = Math.round(g.sheet[1] * scale);
    const ctx = preview.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, preview.width, preview.height);
    const pos = Math.max(0, inc.indexOf(pages[current]));
    const sheetIdx = Math.floor(pos / perSheet());
    const slice = inc.slice(sheetIdx * perSheet(), (sheetIdx + 1) * perSheet());
    slice.forEach((p, i) => {
      const col = i % s.cols, row = Math.floor(i / s.cols);
      const k = Math.min(g.cellW / p.widthPt, g.cellH / p.heightPt);
      const w = p.widthPt * k, h = p.heightPt * k;
      const x = g.m + col * (g.cellW + g.g) + (g.cellW - w) / 2;
      const y = g.m + row * (g.cellH + g.g) + (g.cellH - h) / 2;
      if (p.thumbCanvas.width) ctx.drawImage(p.thumbCanvas, x * scale, y * scale, w * scale, h * scale);
      if (s.border) { ctx.strokeStyle = '#b3b3b3'; ctx.lineWidth = 1; ctx.strokeRect(x * scale, y * scale, w * scale, h * scale); }
    });
    fitPreview();
    const sheets = Math.ceil(inc.length / perSheet());
    previewLabel.textContent = `Printed sheet ${sheetIdx + 1} of ${sheets} · A4 ${g.sheet[0] > g.sheet[1] ? 'landscape' : 'portrait'}`;
  }

  /**
   * For a "slides per page" preset, choose the rows × columns (and, in Auto,
   * the orientation) that makes each slide as large as possible — e.g. two
   * 16:9 slides stack top-and-bottom on portrait A4.
   */
  function applyPerPage() {
    const n = s.perPage;
    if (!n) return;
    const ref = included()[0] ?? pages[0];
    const pw = ref?.widthPt ?? 960, ph = ref?.heightPt ?? 540;
    const sheets: [number, number][] =
      s.orientation === 'portrait' ? [A4] : s.orientation === 'landscape' ? [[A4[1], A4[0]]] : [A4, [A4[1], A4[0]]];
    let best = { cols: 1, rows: n, scale: -1 };
    for (let cols = 1; cols <= Math.min(8, n); cols++) {
      if (n % cols) continue;
      const rows = n / cols;
      if (rows > 8) continue;
      for (const sh of sheets) {
        const m = s.margin * MM, g = s.gap * MM;
        const cellW = (sh[0] - m * 2 - g * (cols - 1)) / cols;
        const cellH = (sh[1] - m * 2 - g * (rows - 1)) / rows;
        const scale = Math.min(cellW / pw, cellH / ph);
        if (scale > best.scale) best = { cols, rows, scale };
      }
    }
    s.cols = best.cols;
    s.rows = best.rows;
  }

  /** Scale the preview canvas (CSS size) to fit its box without cropping. */
  function fitPreview() {
    const box = previewWrap.getBoundingClientRect();
    if (!preview.width || !box.width) return;
    const k = Math.min((box.width - 24) / preview.width, (box.height - 24) / preview.height);
    preview.style.width = `${Math.max(1, preview.width * k)}px`;
    preview.style.height = `${Math.max(1, preview.height * k)}px`;
  }

  // ---------- summary ----------
  function updateSummary() {
    const n = included().length;
    const sheets = s.paper === 'original' && perSheet() === 1 ? n : Math.ceil(n / perSheet());
    $('[data-cs-summary]').textContent = n ? `${n} page${n === 1 ? '' : 's'} → ${sheets} sheet${sheets === 1 ? '' : 's'}` : 'No pages selected';
    $('[data-cs-summary-sub]').textContent = `${perSheet()} per page · ${s.paper === 'a4' || perSheet() > 1 ? 'A4' : 'original size'}`;
    $('[data-cs-selected]').textContent = `${n} of ${pages.length} pages selected`;
    $<HTMLButtonElement>('[data-cs-download]').disabled = n === 0;
    $('[data-cs-file]').textContent = `${baseName}.pdf · ${pages.length} page${pages.length === 1 ? '' : 's'}`;
  }

  // ---------- controls ----------
  function syncControls() {
    $$<HTMLButtonElement>('[data-cs-invert]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.csInvert === s.invertMode)));
    $$<HTMLButtonElement>('[data-cs-orient]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.csOrient === s.orientation)));
    $$<HTMLButtonElement>('[data-cs-paper]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.csPaper === s.paper)));
    $$<HTMLButtonElement>('[data-cs-quality]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.csQuality) === s.quality)));
    $$<HTMLButtonElement>('[data-cs-view]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.csView === view)));
    $$<HTMLButtonElement>('[data-cs-count]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.csCount) === s.cols * s.rows)));
    $$<HTMLInputElement | HTMLSelectElement>('[data-cs-set]').forEach((el) => {
      const key = el.dataset.csSet as keyof Settings;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(s[key]);
      else el.value = String(s[key]);
      const out = wsEl.querySelector(`[data-cs-out="${key}"]`);
      if (out) out.textContent = key === 'margin' || key === 'gap' ? `${s[key]} mm` : `${s[key]}%`;
    });
    $<HTMLInputElement>('[data-cs-erase-toggle]').checked = s.eraseOn;
    $('[data-cs-erase]').hidden = !s.eraseOn;
    const notes: Record<Settings['invertMode'], string> = {
      auto: 'Only dark pages are inverted. White pages stay as they are.',
      all: 'Every page is inverted.',
      custom: 'Use the ◐ Invert button on each page below.',
      off: 'Colours are kept as they are.',
    };
    $('[data-cs-invert-note]').textContent = notes[s.invertMode];
    $('[data-cs-paper-note]').textContent = s.paper === 'a4' ? 'Pages are fitted and centred on A4 — print at 100% scale.' : 'Keeps each page’s original size (A4 is still used when slides per page is more than 1).';
  }

  function setInvertMode(m: Settings['invertMode']) {
    s.invertMode = m;
    syncControls();
  }

  let pending = 0;
  function onChange(all = true) {
    syncControls();
    updateSummary();
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (all) repaintAllThumbs();
      renderPreview();
    });
  }

  wsEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-cs-set]').forEach((el) => {
    const key = el.dataset.csSet as keyof Settings;
    el.addEventListener('input', () => {
      (s as any)[key] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : Number(el.value);
      if (key === 'cols' || key === 'rows') s.perPage = null; // manual grid wins
      if (key === 'margin' || key === 'gap') applyPerPage();
      const layoutOnly = ['cols', 'rows', 'margin', 'gap', 'border'].includes(key);
      if (layoutOnly) view = 'sheet';
      onChange(!layoutOnly);
    });
  });
  $<HTMLInputElement>('[data-cs-erase-toggle]').addEventListener('change', (e) => { s.eraseOn = (e.target as HTMLInputElement).checked; onChange(); });
  $$<HTMLButtonElement>('[data-cs-invert]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.csInvert as Settings['invertMode'];
    if (m === 'custom' && s.invertMode !== 'custom') pages.forEach((q) => (q.invert = invertFor(q)));
    setInvertMode(m);
    onChange();
  }));
  $$<HTMLButtonElement>('[data-cs-count]').forEach((b) => b.addEventListener('click', () => {
    s.perPage = Number(b.dataset.csCount);
    applyPerPage();
    view = 'sheet';
    onChange(false);
  }));
  $$<HTMLButtonElement>('[data-cs-orient]').forEach((b) => b.addEventListener('click', () => {
    s.orientation = b.dataset.csOrient as Settings['orientation'];
    applyPerPage();
    view = 'sheet';
    onChange(false);
  }));
  $$<HTMLButtonElement>('[data-cs-paper]').forEach((b) => b.addEventListener('click', () => { s.paper = b.dataset.csPaper as Settings['paper']; onChange(false); }));
  $$<HTMLButtonElement>('[data-cs-quality]').forEach((b) => b.addEventListener('click', () => { s.quality = Number(b.dataset.csQuality); syncControls(); }));
  $$<HTMLButtonElement>('[data-cs-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.csView as typeof view; syncControls(); renderPreview(); }));
  $('[data-cs-reset-enhance]').addEventListener('click', () => { Object.assign(s, DEFAULT_ENHANCE, { invertMode: 'auto' }); onChange(); });
  $('[data-cs-all]').addEventListener('click', () => { pages.forEach((p) => (p.include = true)); buildThumbs(); onChange(false); });
  $('[data-cs-none]').addEventListener('click', () => { pages.forEach((p) => (p.include = false)); buildThumbs(); onChange(false); });

  $$<HTMLButtonElement>('[data-cs-tab]').forEach((b) => b.addEventListener('click', () => {
    $$<HTMLButtonElement>('[data-cs-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    $$('[data-cs-pane]').forEach((p) => (p.hidden = p.dataset.csPane !== b.dataset.csTab));
    if (b.dataset.csTab === 'layout') { view = 'sheet'; syncControls(); renderPreview(); }
  }));

  const orig = $('[data-cs-original]');
  const holdOn = () => { showOriginal = true; if (view === 'sheet') { view = 'page'; syncControls(); } renderPreview(); };
  const holdOff = () => { if (!showOriginal) return; showOriginal = false; renderPreview(); };
  orig.addEventListener('pointerdown', holdOn);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => orig.addEventListener(ev, holdOff));
  orig.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') holdOn(); });
  orig.addEventListener('keyup', holdOff);

  // Keyboard: ←/→ move between pages, Esc closes.
  ws.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('input, select, textarea')) return;
    if (e.key === 'ArrowRight' && current < pages.length - 1) { current++; markCurrent(); renderPreview(); }
    if (e.key === 'ArrowLeft' && current > 0) { current--; markCurrent(); renderPreview(); }
    if (e.key === 'Escape') closeWorkspace();
  });

  // ---------- open / close ----------
  function openWorkspace() {
    if (!ws.hidden) return;
    ws.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    syncControls();
    (ws.querySelector('[data-cs-close]') as HTMLElement).focus();
  }
  function closeWorkspace() {
    ws.hidden = true;
    document.documentElement.style.overflow = '';
    drop.scrollIntoView({ block: 'center' });
  }
  $('[data-cs-close]').addEventListener('click', closeWorkspace);
  $('[data-cs-restart]').addEventListener('click', () => { closeWorkspace(); pages = []; thumbsEl.replaceChildren(); input.click(); });

  // ---------- busy ----------
  // Loading and exporting both use the overlay; each only closes its own.
  let busyMode: 'loading' | 'export' | null = null;
  function showBusy(text: string, mode: 'loading' | 'export' = 'loading') { busyMode = mode; busy.hidden = false; done.hidden = true; busyText.textContent = text; busyBar.style.width = '0%'; }
  function hideBusy(mode?: 'loading' | 'export') { if (mode && busyMode !== mode) return; busyMode = null; busy.hidden = true; }
  $('[data-cs-back]').addEventListener('click', () => hideBusy());
  $('[data-cs-again]').addEventListener('click', () => { if (lastDownload) downloadBlob(lastDownload.blob, lastDownload.name); });

  // ---------- export ----------
  $('[data-cs-download]').addEventListener('click', async () => {
    const list = included();
    if (!list.length) return;
    showBusy('Preparing your PDF…', 'export');
    try {
      const { PDFDocument } = await getPdfLib();
      const out = await PDFDocument.create();
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        busyText.textContent = `Converting page ${i + 1} of ${list.length}…`;
        busyBar.style.width = `${(i / list.length) * 90}%`;
        // Cap pixels for iOS canvas limits.
        let widthPx = (p.widthPt * s.quality) / 72;
        const area = widthPx * ((p.heightPt * s.quality) / 72);
        if (area > 14_000_000) widthPx *= Math.sqrt(14_000_000 / area);
        const img = await renderToImage(p, Math.round(widthPx));
        // Thumbnail not analysed yet (export started while loading): detect now.
        if (!p.thumb) { p.dark = meanLuminance(img) < DARK_THRESHOLD; p.invert = p.dark; }
        applyEnhance(img, enhanceFor(p));
        const c = document.createElement('canvas');
        drawImage(c, img);
        const jpg = await out.embedJpg(await canvasToBytes(c, 'image/jpeg', 0.85));
        out.addPage([p.widthPt, p.heightPt]).drawImage(jpg, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
      }
      busyText.textContent = 'Laying out pages…';
      busyBar.style.width = '94%';
      let bytes = await out.save();
      if (!(s.paper === 'original' && perSheet() === 1)) {
        bytes = await nUpGrid(bytes, { cols: s.cols, rows: s.rows, orientation: s.orientation, marginMm: s.margin, gapMm: s.gap, border: s.border && perSheet() > 1 });
      }
      busyBar.style.width = '100%';
      const name = `${(filenameInput.value.trim() || `${baseName}-print-ready`).replace(/[\\/:*?"<>|]+/g, '-').replace(/\.pdf$/i, '')}.pdf`;
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      lastDownload = { blob, name };
      downloadBlob(blob, name);
      busyText.textContent = '';
      $('[data-cs-done-msg]').textContent = `${name} has been downloaded. Print it at 100% scale (“Actual size”).`;
      done.hidden = false;
    } catch (err: any) {
      busyText.textContent = /memory|allocation/i.test(String(err?.message)) ? 'Your device ran out of memory. Choose Draft quality in Export, or deselect some pages.' : 'Something went wrong while converting. Try Draft quality, or a different file.';
      done.hidden = true;
      setTimeout(() => hideBusy('export'), 4000);
    }
  });

  // ---------- entry points ----------
  input.addEventListener('change', () => { const f = Array.from(input.files ?? []); input.value = ''; addFiles(f, true); });
  addInput.addEventListener('change', () => { const f = Array.from(addInput.files ?? []); addInput.value = ''; addFiles(f, false); });
  drop.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('label, button')) input.click(); });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); addFiles(Array.from(e.dataTransfer?.files ?? []), true); });
  ws.addEventListener('dragover', (e) => e.preventDefault());
  ws.addEventListener('drop', (e) => { if (e.dataTransfer?.files.length) { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files), false); } });
  $<HTMLButtonElement>('[data-cs-sample]').addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await fetch(root.dataset.sample!);
    addFiles([new File([await res.blob()], 'sample-dark-notes.pdf', { type: 'application/pdf' })], true);
  });
  addEventListener('resize', () => { if (!ws.hidden) renderPreview(); });

  syncControls();
}
