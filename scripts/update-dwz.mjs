// Updates dwz_list in docs/content.json with current data from the German
// Chess Federation's club page. Aborts on any error without touching the
// existing list.
//
// The old DeWIS CSV endpoint (php/dewis/verein.php) still answers but has
// served frozen pre-reform values since the new rating portal went live in
// July 2026, so this reads the club page instead.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ZPS = '90034'; // SC Ostertal e.V.
const URL = `https://www.schachbund.de/dwz-vereine/${ZPS}.html`;
const CONTENT_JSON = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'content.json');

// Sanity check: a truncated or empty response must not overwrite the list.
const MIN_PLAYERS = 10;

const res = await fetch(URL);
if (!res.ok) {
  console.error(`Request failed: HTTP ${res.status}`);
  process.exit(1);
}
const html = await res.text();

// Table columns: Pl. | Mgl-Nr. | Status | Spielername | LetzteAusw. | DWZ | Elo | Titel
const [I_NAME, I_DWZ, I_ELO] = [3, 5, 6];
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const players = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => stripTags(c[1])))
  // Player rows start with a rank like "1." — this skips header and info rows
  .filter((cells) => cells.length > I_ELO && /^\d+\.$/.test(cells[0]))
  .map((cells) => {
    // The DWZ cell reads "1234 - 56" (rating and index); "-" means unrated
    const dwz = parseInt(cells[I_DWZ], 10);
    const elo = parseInt(cells[I_ELO], 10);
    return {
      name: cells[I_NAME],
      dwz: Number.isFinite(dwz) && dwz > 0 ? dwz : null,
      elo: Number.isFinite(elo) && elo > 0 ? elo : null,
    };
  })
  .filter((p) => p.name.length > 1);

if (players.length < MIN_PLAYERS) {
  console.error(`Only ${players.length} members parsed — aborting as a safety measure.`);
  process.exit(1);
}

players.sort((a, b) => (b.dwz ?? -1) - (a.dwz ?? -1) || a.name.localeCompare(b.name, 'de'));

const content = await readFile(CONTENT_JSON, 'utf8');

// The source omits the FIDE Elo for some players — keep the values already in
// the list rather than discarding them.
const existing = new Map(
  (JSON.parse(content).dwz_list ?? []).map((p) => [normalizeName(p.name), p.elo]),
);
function normalizeName(name) {
  return name.replace(/\bDr\.\s*/g, '').replace(/\s+/g, ' ').trim();
}
for (const p of players) {
  if (p.elo === null) p.elo = existing.get(normalizeName(p.name)) ?? null;
}

// Keep the file's existing line ending, otherwise the block always differs
// and every run would report a change (CRLF checkouts on Windows).
const eol = content.includes('\r\n') ? '\r\n' : '\n';

const entries = players.map((p, i) => {
  const dwz = p.dwz === null ? 'null' : String(p.dwz);
  const elo = p.elo === null ? 'null' : String(p.elo);
  return `    {"rank": ${i + 1}, "name": ${JSON.stringify(p.name)}, "dwz": ${dwz}, "elo": ${elo}}`;
});
const newBlock = `"dwz_list": [${eol}${entries.join(',' + eol)}${eol}  ]`;

const pattern = /"dwz_list": \[[\s\S]*?\r?\n  \]/;
if (!pattern.test(content)) {
  console.error('dwz_list block not found in content.json.');
  process.exit(1);
}
const updated = content.replace(pattern, newBlock);

JSON.parse(updated); // Validation: nothing is written if the JSON is invalid

if (updated === content) {
  console.log('No changes — dwz_list is up to date.');
} else {
  await writeFile(CONTENT_JSON, updated, 'utf8');
  console.log(`Updated dwz_list with ${players.length} members.`);
}
