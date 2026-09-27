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
