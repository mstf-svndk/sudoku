import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const root = join(process.cwd(), 'dist', 'client');
await access(join(root, 'index.html'));
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else if (
      !entry.name.endsWith('.map') &&
      entry.name !== 'sw.js' &&
      !entry.name.startsWith('.')
    )
      result.push(path);
  }
  return result;
}
const files = (await walk(root)).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const cache = `sudoku-${hash.digest('hex').slice(0, 12)}`;
const urls = [
  '/',
  ...files.map((file) => '/' + relative(root, file).replaceAll('\\', '/')),
];
const worker = `/* Generated from the exact production assets. */
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sudoku-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // Use this version's shell and assets together. A waiting update activates
    // after all old tabs close, so an in-progress game is never force-reloaded.
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match('/')) || fetch(event.request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
`;
await writeFile(join(root, 'sw.js'), worker);
console.log(
  `PWA ready: ${urls.length} local assets, ${cache}. Output: dist/client`,
);
