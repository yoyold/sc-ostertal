# ♞ SC Ostertal – Vereinswebseite

[![GitHub Pages](https://github.com/yoyold/sc-ostertal/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/yoyold/sc-ostertal/actions/workflows/pages/pages-build-deployment)
[![DWZ-Update](https://github.com/yoyold/sc-ostertal/actions/workflows/dwz-update.yml/badge.svg)](https://github.com/yoyold/sc-ostertal/actions/workflows/dwz-update.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsc-ostertal.de&label=sc-ostertal.de)](https://sc-ostertal.de)
[![Letzter Commit](https://img.shields.io/github/last-commit/yoyold/sc-ostertal?label=letzter%20Commit)](https://github.com/yoyold/sc-ostertal/commits/main)

Quellcode der Webseite des **[Schachclub Ostertal e.V.](https://sc-ostertal.de)** –
Neuigkeiten, Termine, Turniere, Mannschaften, DWZ-Liste, Partien und alles rund um den Verein.

Die Seite ist bewusst schlank gehalten: reines HTML, CSS und JavaScript ohne Framework
und ohne Build-Schritt, gehostet über GitHub Pages.

---

## Inhalt

- [Funktionen](#funktionen)
- [Aufbau des Repositorys](#aufbau-des-repositorys)
- [Inhalte pflegen](#inhalte-pflegen)
- [Lokal starten](#lokal-starten)
- [Hilfsskripte](#hilfsskripte)
- [Automatisches DWZ-Update](#automatisches-dwz-update)
- [Deployment](#deployment)

## Funktionen

| Bereich | Seiten |
| --- | --- |
| **Aktuelles & Termine** | Vereinsnachrichten, Terminkalender |
| **Turniere** | Vereinsturnier (Vereinsmeisterschaft, Pokal), Mannschaftsmeisterschaft, Turnierarchiv |
| **Mannschaften** | Aufstellungen, DWZ-Liste (wöchentlich automatisch aktualisiert) |
| **Schach** | Schach lernen, Partien mit eingebautem PGN-Viewer, Aufgabe des Tages, Ressourcen |
| **Verein** | Über uns, Chronik, Kontakt, Impressum |
| **Verwaltung** | Admin-Oberfläche zum Bearbeiten aller Inhalte direkt im Browser |

Weitere Merkmale:

- Alle Inhalte kommen aus einer einzigen Datei: [`docs/content.json`](docs/content.json)
- Schriften (Playfair Display, Source Sans 3, JetBrains Mono) werden selbst gehostet –
  keine externen Anfragen an Google Fonts o. Ä.
- Cache-Busting über Content-Hashes in den Asset-URLs, damit Änderungen sofort sichtbar sind

## Aufbau des Repositorys

```text
sc-ostertal/
├── .github/workflows/
│   └── dwz-update.yml      # wöchentliches DWZ-Update (GitHub Actions)
├── docs/                   # die veröffentlichte Webseite (GitHub-Pages-Quelle)
│   ├── *.html              # einzelne Seiten
│   ├── content.json        # sämtliche Inhalte (News, Termine, Teams, DWZ, Partien …)
│   ├── admin.html          # Admin-Oberfläche
│   ├── css/                # style.css, admin.css
│   ├── js/                 # app.js, pgn-viewer.js, admin.js
│   ├── fonts/              # selbst gehostete Webfonts (woff2)
│   └── CNAME               # eigene Domain: sc-ostertal.de
└── scripts/                # Node.js-Hilfsskripte (siehe unten)
```

## Inhalte pflegen

### Über die Admin-Oberfläche (empfohlen)

1. [sc-ostertal.de/admin.html](https://sc-ostertal.de/admin.html) öffnen (Link auch im Footer).
2. Repository `yoyold/sc-ostertal` und einen GitHub-Token eingeben.
3. Inhalte bearbeiten und speichern – die Änderung wird als Commit auf `main`
   geschrieben und ist nach dem Pages-Deployment (meist 1–2 Minuten) online.

**Token:** Am besten einen
[Fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new)
anlegen, der nur auf dieses Repository beschränkt ist und die Berechtigung
**Contents: Read and write** hat. Ein klassischer Token mit `repo`-Scope funktioniert ebenfalls.
Der Token wird nur lokal im Browser gespeichert – auf fremden Rechnern nach der Arbeit abmelden.

### Direkt im Code

Inhalte stehen in `docs/content.json` (Schlüssel u. a. `club`, `news`, `events`, `teams`,
`leagues`, `dwz_list`, `tournaments`, `pgn_games`, `contacts`, `impressum`).
Änderung committen und auf `main` pushen – fertig.

## Lokal starten

Da die Seiten `content.json` per `fetch` laden, braucht es einen kleinen lokalen Webserver
(Öffnen per `file://` funktioniert nicht):

```bash
npx serve docs
```

oder alternativ:

```bash
python3 -m http.server 8000 --directory docs
```

Danach <http://localhost:8000> (bzw. die von `serve` angezeigte Adresse) aufrufen.

## Hilfsskripte

Alle Skripte brauchen nur **Node.js ≥ 18** und keine Abhängigkeiten.

| Skript | Zweck |
| --- | --- |
| `node scripts/update-nav.mjs` | Schreibt das Hauptmenü in alle HTML-Seiten. Das Menü wird **nur** in diesem Skript gepflegt. |
| `node scripts/bump-assets.mjs` | Hängt Content-Hashes (`?v=…`) an CSS-/JS-Verweise an. **Nach jeder Änderung an CSS oder JS ausführen**, da GitHub Pages Dateien 10 Minuten cacht. |
| `node scripts/update-dwz.mjs` | Holt die aktuelle DWZ-Liste vom DSB-Wertungsportal und aktualisiert `dwz_list` in `content.json`. Benötigt `DSB_API_TOKEN`. |

## Automatisches DWZ-Update

Der Workflow [`dwz-update.yml`](.github/workflows/dwz-update.yml) läuft **jeden Montag um
04:00 UTC** (und manuell über *Actions → Update DWZ list → Run workflow*):

1. ruft die offizielle JSON-Vereinsliste des
   [DSB-Wertungsportals](https://www.schachbund.de/) für den Verein (VKZ `90034`) ab,
2. prüft die Antwort auf Plausibilität (bei Fehlern bleibt die bestehende Liste unangetastet),
3. committet `docs/content.json` nur, wenn sich etwas geändert hat.

**Einrichtung:** Den vom DSB vergebenen Vereinsschlüssel als Repository-Secret
`DSB_API_TOKEN` hinterlegen (*Settings → Secrets and variables → Actions*).
Der Schlüssel wird nie geloggt oder committet. Der DSB bittet um höchstens eine Abfrage pro Tag.

## Deployment

GitHub Pages veröffentlicht automatisch den Ordner `docs/` des Branches `main` unter der
eigenen Domain **[sc-ostertal.de](https://sc-ostertal.de)** (konfiguriert über `docs/CNAME`).
Jeder Push auf `main` – auch aus der Admin-Oberfläche oder vom DWZ-Workflow – löst ein
neues Deployment aus.

---

<sub>© Schachclub Ostertal e.V. · Fragen und Hinweise gerne über die
[Kontaktseite](https://sc-ostertal.de/kontakt.html).</sub>
