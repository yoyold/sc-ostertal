/* ===== SC Ostertal – Admin Panel JavaScript ===== */
/* Uses GitHub API to read/write content.json directly in the repository */

let gh = { owner: '', repo: '', token: '', branch: 'main' };
let content = {};
let fileSha = '';

// ════════════════════════════════════════════
//  LOGIN & GITHUB API
// ════════════════════════════════════════════

async function adminLogin() {
  const owner = document.getElementById('ghOwner').value.trim();
  const repo = document.getElementById('ghRepo').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';

  if (!owner || !repo || !token) {
    showLoginError('Bitte fülle alle Pflichtfelder aus.');
    return;
  }

  gh = { owner, repo, token, branch };

  try {
    // Test connection and load content
    await loadContentFromGitHub();
    // Success – switch to admin
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminLayout').classList.add('active');
    // Store credentials in sessionStorage (only for this session)
    sessionStorage.setItem('gh_admin', JSON.stringify(gh));
    renderDashboard();
    renderNewsList();
    renderEventsList();
    renderTeamsList();
    renderSettingsForm();
  } catch (e) {
    showLoginError('Verbindung fehlgeschlagen: ' + e.message);
  }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.add('show');
}

// Try to restore session
(function restoreSession() {
  const stored = sessionStorage.getItem('gh_admin');
  if (stored) {
    gh = JSON.parse(stored);
    loadContentFromGitHub()
      .then(() => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminLayout').classList.add('active');
        document.getElementById('ghOwner').value = gh.owner;
        document.getElementById('ghRepo').value = gh.repo;
        document.getElementById('ghBranch').value = gh.branch;
        renderDashboard();
        renderNewsList();
        renderEventsList();
        renderTeamsList();
        renderSettingsForm();
      })
      .catch(() => {
        sessionStorage.removeItem('gh_admin');
      });
  }
})();

// ── GitHub API helpers ──

async function ghFetch(path, options = {}) {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${gh.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function loadContentFromGitHub() {
  const data = await ghFetch(`/contents/content.json?ref=${gh.branch}`);
  fileSha = data.sha;
  const decoded = atob(data.content.replace(/\n/g, ''));
  // Handle UTF-8
  const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
  const text = new TextDecoder('utf-8').decode(bytes);
  content = JSON.parse(text);
}

async function saveContentToGitHub(commitMessage) {
  const jsonStr = JSON.stringify(content, null, 2);
  // Encode to base64 with UTF-8 support
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64 = btoa(binary);

  const result = await ghFetch(`/contents/content.json`, {
    method: 'PUT',
    body: JSON.stringify({
      message: commitMessage,
      content: base64,
      sha: fileSha,
      branch: gh.branch,
    }),
  });
  fileSha = result.content.sha;
}

// ════════════════════════════════════════════
//  PANEL NAVIGATION
// ════════════════════════════════════════════

function showPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelector(`.admin-nav a[data-panel="${name}"]`)?.classList.add('active');
  // Hide any open forms
  hideNewsForm();
  hideEventForm();
  hideTeamForm();
}

// ════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════

function renderDashboard() {
  const stats = document.getElementById('dashboardStats');
  if (!stats) return;
  const cards = [
    { label: 'Neuigkeiten', count: (content.neuigkeiten || []).length, icon: '📰' },
    { label: 'Termine', count: (content.termine || []).length, icon: '📅' },
    { label: 'Mannschaften', count: (content.mannschaften || []).length, icon: '👥' },
  ];
  stats.innerHTML = cards.map(c => `
    <div style="background:white;border:1px solid var(--divider);border-radius:2px;padding:1.5rem;text-align:center;">
      <div style="font-size:2rem;margin-bottom:0.5rem;">${c.icon}</div>
      <div style="font-family:var(--font-display);font-size:2.5rem;font-weight:700;">${c.count}</div>
      <div style="font-size:0.85rem;color:var(--stone);text-transform:uppercase;letter-spacing:0.08em;">${c.label}</div>
    </div>
  `).join('');
}

// ════════════════════════════════════════════
//  NEUIGKEITEN CRUD
// ════════════════════════════════════════════

function renderNewsList() {
  const list = document.getElementById('newsList');
  if (!list) return;
  const news = content.neuigkeiten || [];
  const sorted = [...news].sort((a, b) => new Date(b.datum) - new Date(a.datum));
  list.innerHTML = sorted.length ? sorted.map(n => `
    <div class="admin-list-item">
      <div class="item-info">
        <h4>${esc(n.titel)}</h4>
        <p>${formatDate(n.datum)} · ${esc(n.autor)}</p>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editNews('${n.id}')">Bearbeiten</button>
        <button class="btn-sm-delete" onclick="deleteNews('${n.id}')">Löschen</button>
      </div>
    </div>
  `).join('') : '<p style="color:var(--stone)">Noch keine Neuigkeiten vorhanden.</p>';
}

function showNewsForm(data) {
  document.getElementById('newsFormArea').style.display = 'block';
  document.getElementById('newsEditId').value = data?.id || '';
  document.getElementById('newsTitel').value = data?.titel || '';
  document.getElementById('newsDatum').value = data?.datum || new Date().toISOString().split('T')[0];
  document.getElementById('newsAutor').value = data?.autor || '';
  document.getElementById('newsInhalt').value = data?.inhalt || '';
}

function hideNewsForm() {
  document.getElementById('newsFormArea').style.display = 'none';
}

function editNews(id) {
  const item = (content.neuigkeiten || []).find(n => n.id === id);
  if (item) showNewsForm(item);
}

async function saveNews() {
  const id = document.getElementById('newsEditId').value;
  const entry = {
    id: id || String(Date.now()),
    titel: document.getElementById('newsTitel').value.trim(),
    datum: document.getElementById('newsDatum').value,
    autor: document.getElementById('newsAutor').value.trim(),
    inhalt: document.getElementById('newsInhalt').value.trim(),
  };

  if (!entry.titel || !entry.inhalt) {
    toast('Bitte Titel und Inhalt ausfüllen.', 'error');
    return;
  }

  if (!content.neuigkeiten) content.neuigkeiten = [];

  if (id) {
    const idx = content.neuigkeiten.findIndex(n => n.id === id);
    if (idx >= 0) content.neuigkeiten[idx] = entry;
  } else {
    content.neuigkeiten.push(entry);
  }

  try {
    await saveContentToGitHub(`Neuigkeit ${id ? 'bearbeitet' : 'hinzugefügt'}: ${entry.titel}`);
    toast('Neuigkeit gespeichert!', 'success');
    hideNewsForm();
    renderNewsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler beim Speichern: ' + e.message, 'error');
  }
}

async function deleteNews(id) {
  if (!confirm('Diesen Beitrag wirklich löschen?')) return;
  content.neuigkeiten = (content.neuigkeiten || []).filter(n => n.id !== id);
  try {
    await saveContentToGitHub('Neuigkeit gelöscht');
    toast('Beitrag gelöscht.', 'success');
    renderNewsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════
//  TERMINE CRUD
// ════════════════════════════════════════════

function renderEventsList() {
  const list = document.getElementById('eventsList');
  if (!list) return;
  const events = content.termine || [];
  const sorted = [...events].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  list.innerHTML = sorted.length ? sorted.map(t => `
    <div class="admin-list-item">
      <div class="item-info">
        <h4>${esc(t.titel)}</h4>
        <p>${formatDate(t.datum)} · ${t.zeit} Uhr · ${esc(t.ort)}</p>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editEvent('${t.id}')">Bearbeiten</button>
        <button class="btn-sm-delete" onclick="deleteEvent('${t.id}')">Löschen</button>
      </div>
    </div>
  `).join('') : '<p style="color:var(--stone)">Noch keine Termine vorhanden.</p>';
}

function showEventForm(data) {
  document.getElementById('eventFormArea').style.display = 'block';
  document.getElementById('eventEditId').value = data?.id || '';
  document.getElementById('eventTitel').value = data?.titel || '';
  document.getElementById('eventDatum').value = data?.datum || '';
  document.getElementById('eventZeit').value = data?.zeit || '';
  document.getElementById('eventOrt').value = data?.ort || '';
  document.getElementById('eventBeschreibung').value = data?.beschreibung || '';
}

function hideEventForm() {
  document.getElementById('eventFormArea').style.display = 'none';
}

function editEvent(id) {
  const item = (content.termine || []).find(t => t.id === id);
  if (item) showEventForm(item);
}

async function saveEvent() {
  const id = document.getElementById('eventEditId').value;
  const entry = {
    id: id || String(Date.now()),
    titel: document.getElementById('eventTitel').value.trim(),
    datum: document.getElementById('eventDatum').value,
    zeit: document.getElementById('eventZeit').value,
    ort: document.getElementById('eventOrt').value.trim(),
    beschreibung: document.getElementById('eventBeschreibung').value.trim(),
  };

  if (!entry.titel || !entry.datum) {
    toast('Bitte mindestens Titel und Datum angeben.', 'error');
    return;
  }

  if (!content.termine) content.termine = [];

  if (id) {
    const idx = content.termine.findIndex(t => t.id === id);
    if (idx >= 0) content.termine[idx] = entry;
  } else {
    content.termine.push(entry);
  }

  try {
    await saveContentToGitHub(`Termin ${id ? 'bearbeitet' : 'hinzugefügt'}: ${entry.titel}`);
    toast('Termin gespeichert!', 'success');
    hideEventForm();
    renderEventsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler beim Speichern: ' + e.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('Diesen Termin wirklich löschen?')) return;
  content.termine = (content.termine || []).filter(t => t.id !== id);
  try {
    await saveContentToGitHub('Termin gelöscht');
    toast('Termin gelöscht.', 'success');
    renderEventsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════
//  MANNSCHAFTEN CRUD
// ════════════════════════════════════════════

function renderTeamsList() {
  const list = document.getElementById('teamsList');
  if (!list) return;
  const teams = content.mannschaften || [];
  list.innerHTML = teams.length ? teams.map(t => `
    <div class="admin-list-item">
      <div class="item-info">
        <h4>${esc(t.name)}</h4>
        <p>${esc(t.liga)} · ${t.spieler.length} Spieler · Kapitän: ${esc(t.kapitaen)}</p>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editTeam('${t.id}')">Bearbeiten</button>
        <button class="btn-sm-delete" onclick="deleteTeam('${t.id}')">Löschen</button>
      </div>
    </div>
  `).join('') : '<p style="color:var(--stone)">Noch keine Mannschaften vorhanden.</p>';
}

function showTeamForm(data) {
  document.getElementById('teamFormArea').style.display = 'block';
  document.getElementById('teamEditId').value = data?.id || '';
  document.getElementById('teamName').value = data?.name || '';
  document.getElementById('teamLiga').value = data?.liga || '';
  document.getElementById('teamKapitaen').value = data?.kapitaen || '';
  document.getElementById('teamSpieler').value = (data?.spieler || []).join('\n');
}

function hideTeamForm() {
  document.getElementById('teamFormArea').style.display = 'none';
}

function editTeam(id) {
  const item = (content.mannschaften || []).find(t => t.id === id);
  if (item) showTeamForm(item);
}

async function saveTeam() {
  const id = document.getElementById('teamEditId').value;
  const spielerStr = document.getElementById('teamSpieler').value.trim();
  const entry = {
    id: id || String(Date.now()),
    name: document.getElementById('teamName').value.trim(),
    liga: document.getElementById('teamLiga').value.trim(),
    kapitaen: document.getElementById('teamKapitaen').value.trim(),
    spieler: spielerStr ? spielerStr.split('\n').map(s => s.trim()).filter(Boolean) : [],
  };

  if (!entry.name) {
    toast('Bitte Mannschaftsname angeben.', 'error');
    return;
  }

  if (!content.mannschaften) content.mannschaften = [];

  if (id) {
    const idx = content.mannschaften.findIndex(t => t.id === id);
    if (idx >= 0) content.mannschaften[idx] = entry;
  } else {
    content.mannschaften.push(entry);
  }

  try {
    await saveContentToGitHub(`Mannschaft ${id ? 'bearbeitet' : 'hinzugefügt'}: ${entry.name}`);
    toast('Mannschaft gespeichert!', 'success');
    hideTeamForm();
    renderTeamsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler beim Speichern: ' + e.message, 'error');
  }
}

async function deleteTeam(id) {
  if (!confirm('Diese Mannschaft wirklich löschen?')) return;
  content.mannschaften = (content.mannschaften || []).filter(t => t.id !== id);
  try {
    await saveContentToGitHub('Mannschaft gelöscht');
    toast('Mannschaft gelöscht.', 'success');
    renderTeamsList();
    renderDashboard();
  } catch (e) {
    toast('Fehler: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════
//  ALLGEMEINE EINSTELLUNGEN
// ════════════════════════════════════════════

function renderSettingsForm() {
  document.getElementById('setSlogan').value = content.slogan || '';
  document.getElementById('setUeber').value = content.ueber_uns || '';
  document.getElementById('setTraining').value = content.trainingszeiten || '';
  document.getElementById('setAdresse').value = content.adresse || '';
  document.getElementById('setEmail').value = content.email || '';
  document.getElementById('setTelefon').value = content.telefon || '';
}

async function saveSettings() {
  content.slogan = document.getElementById('setSlogan').value.trim();
  content.ueber_uns = document.getElementById('setUeber').value.trim();
  content.trainingszeiten = document.getElementById('setTraining').value.trim();
  content.adresse = document.getElementById('setAdresse').value.trim();
  content.email = document.getElementById('setEmail').value.trim();
  content.telefon = document.getElementById('setTelefon').value.trim();

  try {
    await saveContentToGitHub('Allgemeine Vereinsinfos aktualisiert');
    toast('Einstellungen gespeichert!', 'success');
  } catch (e) {
    toast('Fehler beim Speichern: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str || '';
  return el.innerHTML;
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  setTimeout(() => { el.classList.remove('show'); }, 3500);
}

// Logout
function logout() {
  sessionStorage.removeItem('gh_admin');
  location.reload();
}
