/**
 * Slug → lazily-loaded tool module. Each module exports `run: ToolRunner`.
 */

import type { ToolRunner } from './pdf-runtime';

export const runners: Record<string, () => Promise<{ run: ToolRunner }>> = {
  'dark-to-light': () => import('./pdf-dark-to-light'),
  'pages-per-sheet': () => import('./pdf-pages-per-sheet'),
  'grayscale-pdf': () => import('./pdf-grayscale'),
  merge: () => import('./pdf-merge'),
  'split-pdf': () => import('./pdf-split'),
  'extract-pages': () => import('./pdf-extract-pages'),
  'organize-pdf': () => import('./pdf-organize'),
  'rotate-pdf': () => import('./pdf-rotate'),
  'crop-pdf': () => import('./pdf-crop'),
  'add-page-numbers': () => import('./pdf-add-page-numbers'),
  compress: () => import('./pdf-compress'),
  'pdf-to-jpg': () => import('./pdf-to-jpg'),
  'image-to-pdf': () => import('./pdf-image-to-pdf'),
};
