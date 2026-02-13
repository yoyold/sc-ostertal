/* ===== SC Ostertal – Admin Panel (GitHub CMS) ===== */

const admin = (function () {
  'use strict';

  let state = {
    token: null,
    repo: null,
    content: null,
    sha: null, // current SHA of content.json (needed for GitHub API updates)
    branch: 'main'
  };

  // ===== GitHub API =====

  const gh = {
    async request(endpoint, opts = {}) {
      const url = endpoint.startsWith('http')
        ? endpoint
        : `https://api.github.com/repos/${state.repo}/${endpoint}`;

      const res = await fetch(url, {
        ...opts,
        headers: {
          'Authorization': `token ${state.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          ...opts.headers
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub API error: ${res.status}`);
      }
      return res.json();
    },

    async getContent() {
      const data = await gh.request(`contents/content.json?ref=${state.branch}`);
      state.sha = data.sha;
      const decoded = atob(data.content);
      // Handle UTF-8 properly
      const bytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
      const text = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(text);
    },

    async saveContent(content, message = 'Inhalt aktualisiert via Admin-Panel') {
      const json = JSON.stringify(content, null, 2);
      // Encode UTF-8 properly
      const bytes = new TextEncoder().encode(json);
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const encoded = btoa(binary);

      const data = await gh.request('contents/content.json', {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encoded,
          sha: state.sha,
          branch: state.branch
        })
      });

      state.sha = data.content.sha;
      return data;
    },

    async verifyAccess() {
      return gh.request('');
    }
  };

  // ===== Toast =====

  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ===== Modal =====

  function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-content').innerHTML = html;
    overlay.classList.add('open');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  // Close on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ===== Tab Switching =====

  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('admin-tab')) return;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('panel-' + e.target.dataset.tab).classList.add('active');
  });

  // ===== Rendering =====

  function formatDate(d) {
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function renderAll() {
    renderNewsList();
    renderEventsList();
    renderTournamentsList();
    renderTeamsList();
    renderPGNList();
    renderContactsList();
    renderClubForm();
    renderImpressumForm();
  }

  function renderNewsList() {
    const el = document.getElementById('news-list');
    const news = [...(state.content.news || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (news.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;">Noch keine Beiträge vorhanden.</p>';
      return;
    }

    el.innerHTML = news.map((n, i) => `
      <div class="item-card">
        <div class="item-info">
          <h3>${esc(n.title)}</h3>
          <div class="meta">${formatDate(n.date)} · ${esc(n.author || '–')}</div>
          <div class="preview">${esc(n.content)}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="admin.openNewsEditor('${n.id}')">Bearbeiten</button>
          <button class="btn btn-danger btn-sm" onclick="admin.deleteNews('${n.id}')">Löschen</button>
        </div>
      </div>
    `).join('');
  }

  function renderEventsList() {
    const el = document.getElementById('events-list');
    const events = [...(state.content.events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (events.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;">Keine Termine eingetragen.</p>';
      return;
    }

    el.innerHTML = events.map(e => `
      <div class="item-card">
        <div class="item-info">
          <h3>${esc(e.title)}</h3>
          <div class="meta">${formatDate(e.date)}${e.time ? ' · ' + esc(e.time) + ' Uhr' : ''}</div>
          <div class="preview">${esc(e.description)}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="admin.openEventEditor('${e.id}')">Bearbeiten</button>
          <button class="btn btn-danger btn-sm" onclick="admin.deleteEvent('${e.id}')">Löschen</button>
        </div>
      </div>
    `).join('');
  }

  function renderTeamsList() {
    const el = document.getElementById('teams-list');
    const teams = state.content.teams || [];

    if (teams.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;">Keine Mannschaften eingetragen.</p>';
      return;
    }

    el.innerHTML = teams.map((t, i) => `
      <div class="item-card">
        <div class="item-info">
          <h3>${esc(t.name)}</h3>
          <div class="meta">${esc(t.league)} · ${t.players.length} Spieler</div>
          <div class="preview">${t.players.map(esc).join(', ')}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="admin.openTeamEditor(${i})">Bearbeiten</button>
          <button class="btn btn-danger btn-sm" onclick="admin.deleteTeam(${i})">Löschen</button>
        </div>
      </div>
    `).join('');
  }

  function renderClubForm() {
    const c = state.content.club || {};
    document.getElementById('club-form').innerHTML = `
      <div class="form-group">
        <label>Vereinsname</label>
        <input type="text" id="club-name" value="${esc(c.name || '')}">
      </div>
      <div class="form-group">
        <label>Motto</label>
        <input type="text" id="club-motto" value="${esc(c.motto || '')}">
      </div>
      <div class="form-group">
        <label>Über uns</label>
        <textarea id="club-about" rows="5">${esc(c.about || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Training</label>
          <input type="text" id="club-training" value="${esc(c.training || '')}">
        </div>
        <div class="form-group">
          <label>Gründungsjahr</label>
          <input type="text" id="club-founded" value="${esc(c.founded || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Adresse</label>
        <input type="text" id="club-address" value="${esc(c.address || '')}">
      </div>
      <div class="form-group">
        <label>E-Mail</label>
        <input type="email" id="club-email" value="${esc(c.email || '')}">
      </div>
      <div style="margin-top:1.5rem;">
        <button class="btn btn-primary" style="width:auto;" onclick="admin.saveClubInfo()">Vereinsinfo speichern</button>
      </div>
    `;
  }

  // ===== Editors =====

  function openNewsEditor(id) {
    const item = id ? (state.content.news || []).find(n => n.id === id) : null;
    const isNew = !item;

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neuer Beitrag' : 'Beitrag bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-group">
        <label>Titel</label>
        <input type="text" id="ed-news-title" value="${esc(item?.title || '')}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Datum</label>
          <input type="date" id="ed-news-date" value="${item?.date || new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label>Autor</label>
          <input type="text" id="ed-news-author" value="${esc(item?.author || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Inhalt</label>
        <textarea id="ed-news-content" rows="6">${esc(item?.content || '')}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.saveNews('${id || ''}')">Speichern</button>
      </div>
    `);
  }

  async function saveNews(id) {
    const title = document.getElementById('ed-news-title').value.trim();
    const date = document.getElementById('ed-news-date').value;
    const author = document.getElementById('ed-news-author').value.trim();
    const content = document.getElementById('ed-news-content').value.trim();

    if (!title || !date || !content) {
      toast('Bitte alle Pflichtfelder ausfüllen.', 'error');
      return;
    }

    if (!state.content.news) state.content.news = [];

    if (id) {
      const idx = state.content.news.findIndex(n => n.id === id);
      if (idx >= 0) {
        state.content.news[idx] = { ...state.content.news[idx], title, date, author, content };
      }
    } else {
      state.content.news.push({
        id: Date.now().toString(),
        title, date, author, content
      });
    }

    await saveAndRefresh('Beitrag: ' + title);
    closeModal();
  }

  async function deleteNews(id) {
    if (!confirm('Diesen Beitrag wirklich löschen?')) return;
    state.content.news = (state.content.news || []).filter(n => n.id !== id);
    await saveAndRefresh('Beitrag gelöscht');
  }

  function openEventEditor(id) {
    const item = id ? (state.content.events || []).find(e => e.id === id) : null;
    const isNew = !item;

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neuer Termin' : 'Termin bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-group">
        <label>Titel</label>
        <input type="text" id="ed-event-title" value="${esc(item?.title || '')}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Datum</label>
          <input type="date" id="ed-event-date" value="${item?.date || ''}">
        </div>
        <div class="form-group">
          <label>Uhrzeit</label>
          <input type="text" id="ed-event-time" value="${esc(item?.time || '')}" placeholder="z.B. 19:00">
        </div>
      </div>
      <div class="form-group">
        <label>Beschreibung</label>
        <textarea id="ed-event-desc" rows="4">${esc(item?.description || '')}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.saveEvent('${id || ''}')">Speichern</button>
      </div>
    `);
  }

  async function saveEvent(id) {
    const title = document.getElementById('ed-event-title').value.trim();
    const date = document.getElementById('ed-event-date').value;
    const time = document.getElementById('ed-event-time').value.trim();
    const description = document.getElementById('ed-event-desc').value.trim();

    if (!title || !date) {
      toast('Bitte Titel und Datum ausfüllen.', 'error');
      return;
    }

    if (!state.content.events) state.content.events = [];

    if (id) {
      const idx = state.content.events.findIndex(e => e.id === id);
      if (idx >= 0) {
        state.content.events[idx] = { ...state.content.events[idx], title, date, time, description };
      }
    } else {
      state.content.events.push({
        id: Date.now().toString(),
        title, date, time, description
      });
    }

    await saveAndRefresh('Termin: ' + title);
    closeModal();
  }

  async function deleteEvent(id) {
    if (!confirm('Diesen Termin wirklich löschen?')) return;
    state.content.events = (state.content.events || []).filter(e => e.id !== id);
    await saveAndRefresh('Termin gelöscht');
  }

  function openTeamEditor(idx) {
    const item = typeof idx === 'number' ? (state.content.teams || [])[idx] : null;
    const isNew = !item;

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neue Mannschaft' : 'Mannschaft bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="ed-team-name" value="${esc(item?.name || '')}" placeholder="z.B. 1. Mannschaft">
        </div>
        <div class="form-group">
          <label>Liga</label>
          <input type="text" id="ed-team-league" value="${esc(item?.league || '')}" placeholder="z.B. Saarlandliga">
        </div>
      </div>
      <div class="form-group">
        <label>Spieler (einer pro Zeile)</label>
        <textarea id="ed-team-players" rows="10" placeholder="FM Max Mustermann (Br. 1)&#10;Anna Beispiel (Br. 2)&#10;...">${item ? item.players.join('\n') : ''}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.saveTeam(${typeof idx === 'number' ? idx : -1})">Speichern</button>
      </div>
    `);
  }

  async function saveTeam(idx) {
    const name = document.getElementById('ed-team-name').value.trim();
    const league = document.getElementById('ed-team-league').value.trim();
    const playersRaw = document.getElementById('ed-team-players').value.trim();
    const players = playersRaw.split('\n').map(p => p.trim()).filter(Boolean);

    if (!name || !league) {
      toast('Bitte Name und Liga ausfüllen.', 'error');
      return;
    }

    if (!state.content.teams) state.content.teams = [];

    if (idx >= 0) {
      state.content.teams[idx] = { name, league, players };
    } else {
      state.content.teams.push({ name, league, players });
    }

    await saveAndRefresh('Mannschaft: ' + name);
    closeModal();
  }

  async function deleteTeam(idx) {
    if (!confirm('Diese Mannschaft wirklich löschen?')) return;
    state.content.teams.splice(idx, 1);
    await saveAndRefresh('Mannschaft gelöscht');
  }

  async function saveClubInfo() {
    state.content.club = {
      name: document.getElementById('club-name').value.trim(),
      motto: document.getElementById('club-motto').value.trim(),
      about: document.getElementById('club-about').value.trim(),
      training: document.getElementById('club-training').value.trim(),
      founded: document.getElementById('club-founded').value.trim(),
      address: document.getElementById('club-address').value.trim(),
      email: document.getElementById('club-email').value.trim()
    };
    await saveAndRefresh('Vereinsinfo aktualisiert');
  }

  // ===== Tournaments =====

  function renderTournamentsList() {
    const current = state.content.tournaments?.current || [];
    const archive = state.content.tournaments?.archive || [];

    const elC = document.getElementById('current-tournaments-list');
    elC.innerHTML = current.length === 0
      ? '<p style="color:var(--text-muted);padding:1rem 0;">Keine aktuellen Turniere.</p>'
      : current.map(t => `
        <div class="item-card">
          <div class="item-info">
            <h3>${esc(t.name)}</h3>
            <div class="meta">${esc(t.date_range)} · ${esc(t.type)}</div>
            <div class="preview">${t.standings?.length || 0} Platzierungen eingetragen</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" onclick="admin.openTournamentEditor('current','${t.id}')">Bearbeiten</button>
            <button class="btn btn-danger btn-sm" onclick="admin.deleteTournament('current','${t.id}')">Löschen</button>
          </div>
        </div>`).join('');

    const elA = document.getElementById('archive-tournaments-list');
    elA.innerHTML = archive.length === 0
      ? '<p style="color:var(--text-muted);padding:1rem 0;">Kein Archiv vorhanden.</p>'
      : archive.map(t => `
        <div class="item-card">
          <div class="item-info">
            <h3>${esc(t.name)}</h3>
            <div class="meta">${esc(t.date_range)} · ${esc(t.winner || '–')}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" onclick="admin.openTournamentEditor('archive','${t.id}')">Bearbeiten</button>
            <button class="btn btn-danger btn-sm" onclick="admin.deleteTournament('archive','${t.id}')">Löschen</button>
          </div>
        </div>`).join('');
  }

  function openTournamentEditor(section, id) {
    if (!state.content.tournaments) state.content.tournaments = { current: [], archive: [] };
    const list = state.content.tournaments[section] || [];
    const item = id ? list.find(t => t.id === id) : null;
    const isNew = !item;

    const standingsText = item?.standings?.map(s => `${s.rank}. ${s.player} – ${s.points}`).join('\n') || '';

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neues Turnier' : 'Turnier bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-group"><label>Name</label><input type="text" id="ed-t-name" value="${esc(item?.name || '')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Format</label><input type="text" id="ed-t-type" value="${esc(item?.type || '')}" placeholder="Schweizer System, 7 Runden"></div>
        <div class="form-group"><label>Zeitraum</label><input type="text" id="ed-t-daterange" value="${esc(item?.date_range || '')}" placeholder="März – Mai 2026"></div>
      </div>
      ${section === 'archive' ? `<div class="form-group"><label>Sieger</label><input type="text" id="ed-t-winner" value="${esc(item?.winner || '')}" placeholder="Max Mustermann (6.5/7)"></div>` : ''}
      <div class="form-group"><label>Platzierungen (eine pro Zeile: "1. Name – 6.5/7")</label><textarea id="ed-t-standings" rows="8" placeholder="1. Max Mustermann – 6.5/7&#10;2. Anna Beispiel – 5.5/7">${standingsText}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.saveTournament('${section}','${id || ''}')">Speichern</button>
      </div>
    `);
  }

  async function saveTournament(section, id) {
    const name = document.getElementById('ed-t-name').value.trim();
    const type = document.getElementById('ed-t-type').value.trim();
    const date_range = document.getElementById('ed-t-daterange').value.trim();
    const winner = document.getElementById('ed-t-winner')?.value.trim() || '';
    const standingsRaw = document.getElementById('ed-t-standings').value.trim();

    if (!name) { toast('Bitte Namen eingeben.', 'error'); return; }

    const standings = standingsRaw.split('\n').filter(Boolean).map((line, i) => {
      const match = line.match(/^(\d+)\.\s*(.+?)\s*[–-]\s*(.+)$/);
      if (match) return { rank: parseInt(match[1]), player: match[2].trim(), points: match[3].trim(), games: 0 };
      return { rank: i + 1, player: line, points: '', games: 0 };
    });

    if (!state.content.tournaments) state.content.tournaments = { current: [], archive: [] };
    if (!state.content.tournaments[section]) state.content.tournaments[section] = [];

    const entry = { id: id || Date.now().toString(), name, type, date_range, winner, standings };
    if (id) {
      const idx = state.content.tournaments[section].findIndex(t => t.id === id);
      if (idx >= 0) state.content.tournaments[section][idx] = entry;
    } else {
      state.content.tournaments[section].push(entry);
    }

    await saveAndRefresh('Turnier: ' + name);
    closeModal();
  }

  async function deleteTournament(section, id) {
    if (!confirm('Dieses Turnier wirklich löschen?')) return;
    state.content.tournaments[section] = (state.content.tournaments[section] || []).filter(t => t.id !== id);
    await saveAndRefresh('Turnier gelöscht');
  }

  // ===== PGN Games =====

  function renderPGNList() {
    const el = document.getElementById('pgn-list');
    const games = state.content.pgn_games || [];

    el.innerHTML = games.length === 0
      ? '<p style="color:var(--text-muted);padding:2rem 0;">Keine Partien vorhanden.</p>'
      : games.map(g => `
        <div class="item-card">
          <div class="item-info">
            <h3>${esc(g.title)}</h3>
            <div class="meta">${esc(g.white)} vs. ${esc(g.black)} · ${esc(g.result)} · ${esc(g.date)}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" onclick="admin.openPGNEditor('${g.id}')">Bearbeiten</button>
            <button class="btn btn-danger btn-sm" onclick="admin.deletePGN('${g.id}')">Löschen</button>
          </div>
        </div>`).join('');
  }

  function openPGNEditor(id) {
    const item = id ? (state.content.pgn_games || []).find(g => g.id === id) : null;
    const isNew = !item;

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neue Partie' : 'Partie bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-group"><label>Titel</label><input type="text" id="ed-pgn-title" value="${esc(item?.title || '')}" placeholder="Becker – Schmidt, Vereinsmeisterschaft 2026"></div>
      <div class="form-row">
        <div class="form-group"><label>Weiß</label><input type="text" id="ed-pgn-white" value="${esc(item?.white || '')}"></div>
        <div class="form-group"><label>Schwarz</label><input type="text" id="ed-pgn-black" value="${esc(item?.black || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ergebnis</label><input type="text" id="ed-pgn-result" value="${esc(item?.result || '')}" placeholder="1-0 / 0-1 / 1/2-1/2"></div>
        <div class="form-group"><label>Datum</label><input type="date" id="ed-pgn-date" value="${item?.date || ''}"></div>
      </div>
      <div class="form-group"><label>PGN-Notation</label><textarea id="ed-pgn-pgn" rows="6" style="font-family:var(--font-mono);font-size:0.85rem;">${esc(item?.pgn || '')}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.savePGN('${id || ''}')">Speichern</button>
      </div>
    `);
  }

  async function savePGN(id) {
    const title = document.getElementById('ed-pgn-title').value.trim();
    const white = document.getElementById('ed-pgn-white').value.trim();
    const black = document.getElementById('ed-pgn-black').value.trim();
    const result = document.getElementById('ed-pgn-result').value.trim();
    const date = document.getElementById('ed-pgn-date').value;
    const pgn = document.getElementById('ed-pgn-pgn').value.trim();

    if (!title || !pgn) { toast('Bitte Titel und PGN ausfüllen.', 'error'); return; }

    if (!state.content.pgn_games) state.content.pgn_games = [];

    const entry = { id: id || Date.now().toString(), title, white, black, result, date, pgn };
    if (id) {
      const idx = state.content.pgn_games.findIndex(g => g.id === id);
      if (idx >= 0) state.content.pgn_games[idx] = entry;
    } else {
      state.content.pgn_games.push(entry);
    }

    await saveAndRefresh('Partie: ' + title);
    closeModal();
  }

  async function deletePGN(id) {
    if (!confirm('Diese Partie wirklich löschen?')) return;
    state.content.pgn_games = (state.content.pgn_games || []).filter(g => g.id !== id);
    await saveAndRefresh('Partie gelöscht');
  }

  // ===== Contacts =====

  function renderContactsList() {
    const el = document.getElementById('contacts-list');
    const contacts = state.content.contacts || [];

    el.innerHTML = contacts.length === 0
      ? '<p style="color:var(--text-muted);padding:2rem 0;">Keine Kontakte eingetragen.</p>'
      : contacts.map(c => `
        <div class="item-card">
          <div class="item-info">
            <h3>${esc(c.name)}</h3>
            <div class="meta">${esc(c.role)}${c.email ? ' · ' + esc(c.email) : ''}${c.phone ? ' · ' + esc(c.phone) : ''}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" onclick="admin.openContactEditor('${c.id}')">Bearbeiten</button>
            <button class="btn btn-danger btn-sm" onclick="admin.deleteContact('${c.id}')">Löschen</button>
          </div>
        </div>`).join('');
  }

  function openContactEditor(id) {
    const item = id ? (state.content.contacts || []).find(c => c.id === id) : null;
    const isNew = !item;

    openModal(`
      <div class="modal-header">
        <h3>${isNew ? 'Neuer Kontakt' : 'Kontakt bearbeiten'}</h3>
        <button class="modal-close" onclick="admin.closeModal()">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input type="text" id="ed-c-name" value="${esc(item?.name || '')}"></div>
        <div class="form-group"><label>Funktion</label><input type="text" id="ed-c-role" value="${esc(item?.role || '')}" placeholder="1. Vorsitzender"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>E-Mail</label><input type="email" id="ed-c-email" value="${esc(item?.email || '')}"></div>
        <div class="form-group"><label>Telefon</label><input type="tel" id="ed-c-phone" value="${esc(item?.phone || '')}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="admin.closeModal()">Abbrechen</button>
        <button class="btn btn-primary btn-sm" onclick="admin.saveContact('${id || ''}')">Speichern</button>
      </div>
    `);
  }

  async function saveContact(id) {
    const name = document.getElementById('ed-c-name').value.trim();
    const role = document.getElementById('ed-c-role').value.trim();
    const email = document.getElementById('ed-c-email').value.trim();
    const phone = document.getElementById('ed-c-phone').value.trim();

    if (!name || !role) { toast('Bitte Name und Funktion ausfüllen.', 'error'); return; }

    if (!state.content.contacts) state.content.contacts = [];

    const entry = { id: id || Date.now().toString(), name, role, email, phone };
    if (id) {
      const idx = state.content.contacts.findIndex(c => c.id === id);
      if (idx >= 0) state.content.contacts[idx] = entry;
    } else {
      state.content.contacts.push(entry);
    }

    await saveAndRefresh('Kontakt: ' + name);
    closeModal();
  }

  async function deleteContact(id) {
    if (!confirm('Diesen Kontakt wirklich löschen?')) return;
    state.content.contacts = (state.content.contacts || []).filter(c => c.id !== id);
    await saveAndRefresh('Kontakt gelöscht');
  }

  // ===== Impressum =====

  function renderImpressumForm() {
    const imp = state.content.impressum || {};
    document.getElementById('impressum-form').innerHTML = `
      <div class="form-group"><label>Vereinsname</label><input type="text" id="imp-verein" value="${esc(imp.verein || '')}"></div>
      <div class="form-group"><label>Adresse</label><input type="text" id="imp-address" value="${esc(imp.address || '')}"></div>
      <div class="form-group"><label>E-Mail</label><input type="email" id="imp-email" value="${esc(imp.email || '')}"></div>
      <div class="form-group"><label>Verantwortlicher</label><input type="text" id="imp-responsible" value="${esc(imp.responsible || '')}" placeholder="Max Mustermann (1. Vorsitzender)"></div>
      <div class="form-group"><label>Vereinsregister (optional)</label><input type="text" id="imp-register" value="${esc(imp.register || '')}" placeholder="VR 12345 Amtsgericht Saarbrücken"></div>
      <div class="form-group"><label>Zusätzlicher Text (optional)</label><textarea id="imp-extra" rows="4">${esc(imp.extra || '')}</textarea></div>
      <div style="margin-top:1.5rem;">
        <button class="btn btn-primary" style="width:auto;" onclick="admin.saveImpressum()">Impressum speichern</button>
      </div>
    `;
  }

  async function saveImpressum() {
    state.content.impressum = {
      verein: document.getElementById('imp-verein').value.trim(),
      address: document.getElementById('imp-address').value.trim(),
      email: document.getElementById('imp-email').value.trim(),
      responsible: document.getElementById('imp-responsible').value.trim(),
      register: document.getElementById('imp-register').value.trim(),
      extra: document.getElementById('imp-extra').value.trim()
    };
    await saveAndRefresh('Impressum aktualisiert');
  }

  // ===== Save & Refresh =====


  async function saveAndRefresh(commitMsg) {
    try {
      toast('Speichern…', 'success');
      await gh.saveContent(state.content, commitMsg + ' [Admin-Panel]');
      renderAll();
      toast('Gespeichert & veröffentlicht!', 'success');
    } catch (err) {
      console.error('Save error:', err);
      toast('Fehler beim Speichern: ' + err.message, 'error');
    }
  }

  // ===== Auth =====

  async function login() {
    const repo = document.getElementById('login-repo').value.trim();
    const token = document.getElementById('login-token').value.trim();

    if (!repo || !token) {
      toast('Bitte Repository und Token eingeben.', 'error');
      return;
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Verbinde…';

    try {
      state.token = token;
      state.repo = repo;

      // Verify access
      const repoInfo = await gh.verifyAccess();

      // Detect default branch
      state.branch = repoInfo.default_branch || 'main';

      // Load content
      state.content = await gh.getContent();

      // Persist credentials locally
      localStorage.setItem('sco_repo', repo);
      localStorage.setItem('sco_token', token);
      localStorage.setItem('sco_branch', state.branch);

      // Switch to admin
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-app').style.display = 'block';
      document.getElementById('repo-name').textContent = repo;
      document.getElementById('status-dot').className = 'status-dot';

      renderAll();
      toast('Erfolgreich verbunden!', 'success');
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.message.includes('404') ? 'Repository nicht gefunden. Bitte "user/repo" Format prüfen.' :
                     err.message.includes('401') ? 'Token ungültig oder abgelaufen. Bitte Token prüfen.' :
                     err.message.includes('403') ? 'Keine Berechtigung. Token benötigt "repo"-Berechtigung.' :
                     'Fehler: ' + err.message;
      toast(errMsg, 'error');
      // Also show error in login form
      let errEl = document.getElementById('login-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'login-error';
        errEl.style.cssText = 'color:#c45c5c;font-size:0.85rem;margin-top:0.75rem;padding:10px 14px;background:rgba(196,92,92,0.1);border:1px solid rgba(196,92,92,0.25);border-radius:6px;';
        document.getElementById('login-btn').after(errEl);
      }
      errEl.textContent = errMsg;
      state.token = null;
      state.repo = null;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Anmelden';
    }
  }

  function logout() {
    localStorage.removeItem('sco_repo');
    localStorage.removeItem('sco_token');
    localStorage.removeItem('sco_branch');
    state = { token: null, repo: null, content: null, sha: null, branch: 'main' };
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    toast('Abgemeldet.', 'success');
  }

  // ===== Auto-Login =====

  function tryAutoLogin() {
    const repo = localStorage.getItem('sco_repo');
    const token = localStorage.getItem('sco_token');
    if (repo && token) {
      document.getElementById('login-repo').value = repo;
      document.getElementById('login-token').value = token;
      login();
    }
  }

  // ===== Helpers =====

  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Init =====
  tryAutoLogin();

  // ===== Public API =====
  return {
    login,
    logout,
    openNewsEditor,
    saveNews,
    deleteNews,
    openEventEditor,
    saveEvent,
    deleteEvent,
    openTournamentEditor,
    saveTournament,
    deleteTournament,
    openTeamEditor,
    saveTeam,
    deleteTeam,
    openPGNEditor,
    savePGN,
    deletePGN,
    openContactEditor,
    saveContact,
    deleteContact,
    saveClubInfo,
    saveImpressum,
    closeModal
  };

})();
