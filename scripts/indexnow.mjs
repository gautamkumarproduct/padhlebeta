/**
 * Notify IndexNow (Bing, Yandex, Seznam, Naver…) about every URL in the live sitemap.
 * Run after a deploy that adds or changes pages:  node scripts/indexnow.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';

const host = 'padhlebeta.live';
const keyFile = readdirSync(new URL('../public/', import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
const key = readFileSync(new URL(`../public/${keyFile}`, import.meta.url), 'utf8').trim();
const xml = await (await fetch(`https://${host}/sitemap-0.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status}`);
