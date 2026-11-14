// Updates dwz_list in docs/content.json with current data from the German
// Chess Federation's rating portal. Aborts on any error without touching the
// existing list.
//
// Uses the DSB's official JSON club list (wertungsportal-api/vereinsliste),
// which needs a per-club access key. The key is read from the DSB_API_TOKEN
// environment variable (a GitHub Actions secret) and must never be logged or
// committed. The DSB asks for at most one request per day.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const VKZ = '90034'; // SC Ostertal e.V.
const API = 'https://www.schachbund.de/wertungsportal-api/vereinsliste';
const CONTENT_JSON = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'content.json');

// Sanity check: a truncated or empty response must not overwrite the list.
const MIN_PLAYERS = 10;

const token = process.env.DSB_API_TOKEN?.trim();
if (!token) {
  console.error('DSB_API_TOKEN is not set — add it as a repository secret.');
  process.exit(1);
}
const mask = (s) => String(s).split(token).join('***');

const url = `${API}?token=${encodeURIComponent(token)}&vkz=${VKZ}`;
let res;
try {
  res = await fetch(url, { headers: { Accept: 'application/json' } });
} catch (err) {
  console.error(`Request failed: ${mask(err.message)}`);
  process.exit(1);
}
const body = await res.text();
if (!res.ok) {
  console.error(`Request failed: HTTP ${res.status}: ${mask(body.slice(0, 300))}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(body);
} catch {
  console.error(`Response is not JSON: ${mask(body.slice(0, 300))}`);
  process.exit(1);
}

// The response format is not documented, so the member array and its fields
// are looked up by the names such APIs commonly use, case-insensitively.
function findMemberArray(value, depth = 0) {
  if (Array.isArray(value)) {
    if (value.some((v) => v && typeof v === 'object' && !Array.isArray(v))) return value;
    return null;
  }
  if (value && typeof value === 'object' && depth < 3) {
    for (const v of Object.values(value)) {
      const found = findMemberArray(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function pick(obj, ...names) {
  const wanted = names.map((n) => n.toLowerCase());
  for (const [k, v] of Object.entries(obj)) {
    if (wanted.includes(k.toLowerCase()) && v !== null && v !== undefined && v !== '') return v;
  }
  return undefined;
}

// Ratings come as numbers, as strings like "1234-56" (rating and index), or
// as objects such as {"rating": 1234, "index": 56}; 0 or "-" means unrated.
function toRating(v) {
  if (v && typeof v === 'object') v = pick(v, 'rating', 'value', 'wert', 'dwz', 'elo');
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toName(m) {
  const last = pick(m, 'nachname', 'lastname', 'last_name', 'surname', 'familyname', 'family_name');
  const first = pick(m, 'vorname', 'firstname', 'first_name', 'givenname', 'given_name');
  const title = pick(m, 'titel', 'title', 'akademischertitel');
  let name;
  if (last) {
    name = first ? `${last}, ${first}` : String(last);
  } else {
    name = String(pick(m, 'name', 'spielername', 'spieler', 'playername', 'fullname', 'full_name') ?? '');
  }
  // "Mustermann,Max" -> "Mustermann, Max", as used in the existing list
  name = name.replace(/\s*,\s*/, ', ').replace(/\s+/g, ' ').trim();
  if (title && /^dr\.?/i.test(String(title)) && !/\bDr\./.test(name)) name += ' Dr.';
  return name;
}

const members = findMemberArray(data);
if (!members) {
  const shape = Array.isArray(data) ? 'array' : `object with keys ${Object.keys(data ?? {}).join(', ')}`;
  console.error(`No member list found in the response (${shape}).`);
  process.exit(1);
}

const players = members
  .filter((m) => m && typeof m === 'object')
  .map((m) => ({
    name: toName(m),
    dwz: toRating(pick(m, 'dwz', 'rating', 'dwzwert', 'dwz_rating', 'currentdwz', 'aktuelledwz')),
    elo: toRating(pick(m, 'elo', 'fideelo', 'fide_elo', 'fiderating', 'fide_rating', 'fide')),
  }))
  .filter((p) => p.name.length > 1);

if (players.length < MIN_PLAYERS) {
  // Field names only (no values) to adjust the mapping if the format differs
  const fields = members[0] && typeof members[0] === 'object' ? Object.keys(members[0]).join(', ') : '-';
  console.error(`Only ${players.length} members parsed — aborting as a safety measure. Fields of the first entry: ${fields}`);
  process.exit(1);
}

const rated = players.filter((p) => p.dwz !== null).length;
if (rated === 0) {
  console.error(`No DWZ values found — aborting. Fields of the first entry: ${Object.keys(members[0]).join(', ')}`);
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
