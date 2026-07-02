// Aktualisiert die dwz_list in docs/content.json mit den aktuellen Daten
// des Deutschen Schachbunds (DeWIS). Bricht bei Fehlern ab, ohne die
// bestehende Liste anzutasten.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ZPS = '90034'; // SC Ostertal e.V.
const URL = `https://www.schachbund.de/php/dewis/verein.php?zps=${ZPS}&format=csv`;
const CONTENT_JSON = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'content.json');

// Mindestanzahl Mitglieder als Plausibilitätsprüfung — verhindert, dass eine
// kaputte/leere Antwort die Liste überschreibt.
const MIN_PLAYERS = 10;

const res = await fetch(URL);
if (!res.ok) {
  console.error(`DeWIS-Abruf fehlgeschlagen: HTTP ${res.status}`);
  process.exit(1);
}
const csv = await res.text();

const lines = csv.trim().split('\n');
const header = lines.shift().split('|');
const col = (name) => header.indexOf(name);
const [iNach, iVor, iDwz, iElo] = [col('nachname'), col('vorname'), col('dwz'), col('fideelo')];
if ([iNach, iVor, iDwz, iElo].includes(-1)) {
  console.error('Unerwartetes CSV-Format (Spalten nicht gefunden):', header.join('|'));
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
  console.error(`Nur ${players.length} Mitglieder erhalten — Abbruch als Sicherheitsmaßnahme.`);
  process.exit(1);
}

players.sort((a, b) => (b.dwz ?? -1) - (a.dwz ?? -1) || a.name.localeCompare(b.name, 'de'));

const content = await readFile(CONTENT_JSON, 'utf8');

// DeWIS liefert die FIDE-Elo nicht für alle Spieler — vorhandene Werte aus
// der bestehenden Liste beibehalten, statt sie zu verwerfen.
const existing = new Map(
  (JSON.parse(content).dwz_list ?? []).map((p) => [normalizeName(p.name), p.elo]),
);
function normalizeName(name) {
  return name.replace(/\bDr\.\s*/g, '').replace(/\s+/g, ' ').trim();
}
for (const p of players) {
  if (p.elo === null) p.elo = existing.get(normalizeName(p.name)) ?? null;
}

const entries = players.map((p, i) => {
  const dwz = p.dwz === null ? 'null' : String(p.dwz);
  const elo = p.elo === null ? 'null' : String(p.elo);
  return `    {"rank": ${i + 1}, "name": ${JSON.stringify(p.name)}, "dwz": ${dwz}, "elo": ${elo}}`;
});
const newBlock = `"dwz_list": [\n${entries.join(',\n')}\n  ]`;

const pattern = /"dwz_list": \[[\s\S]*?\n  \]/;
if (!pattern.test(content)) {
  console.error('dwz_list-Block in content.json nicht gefunden.');
  process.exit(1);
}
const updated = content.replace(pattern, newBlock);

JSON.parse(updated); // Validierung: bei ungültigem JSON wird nichts geschrieben

if (updated === content) {
  console.log('Keine Änderungen — dwz_list ist aktuell.');
} else {
  await writeFile(CONTENT_JSON, updated, 'utf8');
  console.log(`dwz_list mit ${players.length} Mitgliedern aktualisiert.`);
}
