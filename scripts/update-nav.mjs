// Schreibt die Hauptnavigation in alle HTML-Seiten unter docs/.
// Menüpunkte hier zentral pflegen, dann: node scripts/update-nav.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');

const MENU = [
  { href: 'aktuelles.html', label: 'Aktuelles' },
  { href: 'termine.html', label: 'Termine' },
  { href: 'vereinsturnier.html', label: 'Turniere', children: [
    ['vereinsturnier.html', 'Vereinsturnier'],
    ['mannschaftsmeisterschaft.html', 'Mannschaftsmeisterschaft'],
    ['turnierarchiv.html', 'Turnierarchiv'],
  ]},
  { href: 'mannschaften.html', label: 'Mannschaften', children: [
    ['mannschaften.html', 'Aufstellungen'],
    ['dwz.html', 'DWZ-Liste'],
  ]},
  { href: 'schach.html', label: 'Schach', children: [
    ['schach.html', 'Schach lernen'],
    ['partien.html', 'Partien'],
    ['aufgabe.html', 'Aufgabe des Tages'],
    ['ressourcen.html', 'Ressourcen'],
  ]},
  { href: 'verein.html', label: 'Verein', children: [
    ['verein.html', 'Über uns'],
    ['chronik.html', 'Chronik'],
  ]},
  { href: 'kontakt.html', label: 'Kontakt' },
  { href: 'admin.html', label: 'Admin', cls: 'nav-admin' },
];

// Seiten ohne Standard-Nav
const SKIP = new Set(['admin.html', 'turniere.html']);

function buildNav(page) {
  const lines = ['<ul class="nav-links">'];
  for (const item of MENU) {
    if (item.children) {
      const parentActive = item.children.some(([href]) => href === page);
      lines.push(`        <li class="nav-dropdown"><a href="${item.href}"${parentActive ? ' class="active"' : ''}>${item.label} ▾</a>`);
      lines.push('          <ul class="nav-sub">');
      for (const [href, label] of item.children) {
        lines.push(`            <li><a href="${href}"${href === page ? ' class="active"' : ''}>${label}</a></li>`);
      }
      lines.push('          </ul>');
      lines.push('        </li>');
    } else {
      const cls = [item.cls, item.href === page ? 'active' : ''].filter(Boolean).join(' ');
      lines.push(`        <li><a href="${item.href}"${cls ? ` class="${cls}"` : ''}>${item.label}</a></li>`);
    }
  }
  lines.push('      </ul>');
  return lines.join('\n');
}

// Findet den kompletten nav-links-Block inkl. verschachtelter <ul> (Balance-Zählung)
function findNavBlock(html) {
  const start = html.indexOf('<ul class="nav-links">');
  if (start === -1) return null;
  let depth = 0;
  const re = /<ul[\s>]|<\/ul>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html)) !== null) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { start, end: m.index + m[0].length };
  }
  return null;
}

let changed = 0;
for (const file of (await readdir(DOCS)).filter(f => f.endsWith('.html'))) {
  if (SKIP.has(file)) continue;
  const path = join(DOCS, file);
  const html = await readFile(path, 'utf8');
  const block = findNavBlock(html);
  if (!block) { console.warn(`Kein Nav-Block: ${file}`); continue; }
  const updated = html.slice(0, block.start) + buildNav(file) + html.slice(block.end);
  if (updated !== html) {
    await writeFile(path, updated, 'utf8');
    console.log(`Aktualisiert: ${file}`);
    changed++;
  }
}
console.log(changed === 0 ? 'Alles aktuell — keine Änderungen.' : `${changed} Datei(en) aktualisiert.`);
