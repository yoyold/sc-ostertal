// Appends a content hash to the CSS/JS references in docs/*.html, so browsers
// fetch a changed file immediately instead of serving the cached copy.
// GitHub Pages sends Cache-Control: max-age=600 and cannot be configured, so
// the version has to travel in the URL. Run after changing CSS or JS:
//   node scripts/bump-assets.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const ASSETS = ['css/style.css', 'css/admin.css', 'js/app.js', 'js/pgn-viewer.js', 'js/admin.js'];

const version = {};
for (const rel of ASSETS) {
  const buf = await readFile(join(DOCS, rel));
  version[rel] = createHash('sha1').update(buf).digest('hex').slice(0, 8);
}

let changed = 0;
for (const file of (await readdir(DOCS)).filter((f) => f.endsWith('.html'))) {
  const path = join(DOCS, file);
  const html = await readFile(path, 'utf8');
  let updated = html;
  for (const [rel, v] of Object.entries(version)) {
    // Matches the reference with or without an existing ?v=... suffix
    const re = new RegExp(`(["'])${rel.replace('/', '\\/')}(\\?v=[a-f0-9]+)?\\1`, 'g');
    updated = updated.replace(re, `$1${rel}?v=${v}$1`);
  }
  if (updated !== html) {
    await writeFile(path, updated, 'utf8');
    console.log(`Updated: ${file}`);
    changed++;
  }
}

console.log(Object.entries(version).map(([k, v]) => `  ${k} -> ${v}`).join('\n'));
console.log(changed === 0 ? 'Everything up to date — no changes.' : `Updated ${changed} file(s).`);
