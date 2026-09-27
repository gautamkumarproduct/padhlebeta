/**
 * Base-path-aware URL helpers. Every internal link goes through `url()` so the
 * site works both at a sub-path (github.io/padhlebeta) and at a domain root.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const SITE = (import.meta.env.SITE ?? '').replace(/\/$/, '');

/** Root-relative path including the base, e.g. url('/tools/') → '/padhlebeta/tools/'. */
export function url(path = '/'): string {
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  const p = path.startsWith('/') ? path : '/' + path;
  if (BASE && (p === BASE || p.startsWith(BASE + '/'))) return p;
  return BASE + p;
}

/** Fully-qualified URL, for canonical tags, OG tags and JSON-LD. */
export function absUrl(path = '/'): string {
  if (/^https?:/.test(path)) return path;
  return SITE + url(path);
}
