// Updates dwz_list in docs/content.json with current data from the German
// Chess Federation (DeWIS). Aborts on any error without touching the
// existing list.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ZPS = '90034'; // SC Ostertal e.V.
const URL = `https://www.schachbund.de/php/dewis/verein.php?zps=${ZPS}&format=csv`;
const CONTENT_JSON = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'content.json');

// Sanity check: a truncated or empty response must not overwrite the list.
const MIN_PLAYERS = 10;

const res = await fetch(URL);
if (!res.ok) {
  console.error(`DeWIS request failed: HTTP ${res.status}`);
  process.exit(1);
}
const csv = await res.text();

const lines = csv.trim().split('\n');
const header = lines.shift().split('|');
const col = (name) => header.indexOf(name);
const [iNach, iVor, iDwz, iElo] = [col('nachname'), col('vorname'), col('dwz'), col('fideelo')];
if ([iNach, iVor, iDwz, iElo].includes(-1)) {
  console.error('Unexpected CSV format (columns not found):', header.join('|'));
  process.exit(1);
}

const players = lines
  .map((line) => {
    const f = line.split('|');
    const dwz = parseInt(f[iDwz], 10);
    const elo = parseInt(f[iElo], 10);
    return {
      name: `${f[iNach]}, ${f[iVor]}`.trim(),
      dwz: Number.isFinite(dwz) && dwz > 0 ? dwz : null,
      elo: Number.isFinite(elo) && elo > 0 ? elo : null,
    };
  })
  .filter((p) => p.name.length > 1);

if (players.length < MIN_PLAYERS) {
  console.error(`Only ${players.length} members returned — aborting as a safety measure.`);
  process.exit(1);
}

players.sort((a, b) => (b.dwz ?? -1) - (a.dwz ?? -1) || a.name.localeCompare(b.name, 'de'));

const content = await readFile(CONTENT_JSON, 'utf8');

// DeWIS omits the FIDE Elo for some players — keep the values already in the
// list rather than discarding them.
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
