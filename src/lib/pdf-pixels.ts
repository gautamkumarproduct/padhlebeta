/**
 * Per-pixel operations on rendered pages. All work in place on ImageData.
 */

/** Mean luminance (0–255) sampled on a sparse grid — fast even on 220-DPI pages. */
export function meanLuminance(img: ImageData): number {
  const d = img.data;
  const step = 4 * 17; // every 17th pixel
  let sum = 0;
  let n = 0;
  for (let p = 0; p < d.length; p += step) {
    sum += 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    n++;
  }
  return n ? sum / n : 255;
}

export type PixelOpts = {
  invert?: boolean;
  grayscale?: boolean;
  /** Stretch levels so near-white (≥ this value) becomes pure white. 0 disables. */
  whitePoint?: number;
};

export function transformPixels(img: ImageData, { invert = false, grayscale = false, whitePoint = 0 }: PixelOpts) {
  const d = img.data;
  const stretch = whitePoint > 0 ? 255 / whitePoint : 1;
  for (let p = 0; p < d.length; p += 4) {
    let r = d[p];
    let g = d[p + 1];
    let b = d[p + 2];
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    if (grayscale) {
      r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    if (whitePoint > 0) {
      r = Math.min(255, r * stretch);
      g = Math.min(255, g * stretch);
      b = Math.min(255, b * stretch);
    }
    d[p] = r;
    d[p + 1] = g;
    d[p + 2] = b;
  }
}

export type Enhance = {
  invert: boolean;
  grayscale: boolean;
  /** Snap near-white pixels to pure white. */
  forceWhite: boolean;
  /** 50–150 (%). */
  brightness: number;
  /** 50–200 (%). */
  contrast: number;
  /** 0–100. Unsharp-mask strength. */
  sharpen: number;
  /** Paint the top / bottom N% of the page white (logos, headers, watermarks). */
  eraseTop: number;
  eraseBottom: number;
};

/**
 * Full enhancement pipeline used by the converter studio, for both the live
 * preview and the export. Order: invert → brightness/contrast → grayscale →
 * snap-to-white → sharpen → erase strips.
 */
export function applyEnhance(img: ImageData, e: Enhance) {
  const d = img.data;
  const b = e.brightness / 100;
  const c = e.contrast / 100;
  const tone = b !== 1 || c !== 1;
  for (let p = 0; p < d.length; p += 4) {
    let r = d[p], g = d[p + 1], bl = d[p + 2];
    if (e.invert) { r = 255 - r; g = 255 - g; bl = 255 - bl; }
    if (tone) {
      r = (r * b - 128) * c + 128;
      g = (g * b - 128) * c + 128;
      bl = (bl * b - 128) * c + 128;
    }
    if (e.grayscale) r = g = bl = 0.299 * r + 0.587 * g + 0.114 * bl;
    if (e.forceWhite && 0.299 * r + 0.587 * g + 0.114 * bl > 205) r = g = bl = 255;
    d[p] = r; d[p + 1] = g; d[p + 2] = bl;
  }
  if (e.sharpen > 0) sharpen(img, e.sharpen / 100);
  const w = img.width, h = img.height;
  const top = Math.round((h * e.eraseTop) / 100);
  const bottom = Math.round((h * e.eraseBottom) / 100);
  if (top > 0) d.fill(255, 0, top * w * 4);
  if (bottom > 0) d.fill(255, (h - bottom) * w * 4);
}

/** Unsharp mask with a 3×3 box blur. `amount` 0–1 (mapped to 0–1.5×). */
function sharpen(img: ImageData, amount: number) {
  const { width: w, height: h, data: d } = img;
  const src = new Uint8ClampedArray(d);
  const k = amount * 1.5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const o = i + ch;
        const blur =
          (src[o - 4 - w * 4] + src[o - w * 4] + src[o + 4 - w * 4] +
            src[o - 4] + src[o] + src[o + 4] +
            src[o - 4 + w * 4] + src[o + w * 4] + src[o + 4 + w * 4]) / 9;
        d[o] = src[o] + k * (src[o] - blur);
      }
    }
  }
}
