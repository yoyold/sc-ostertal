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
          'Authorization': `Bearer ${state.token}`,
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
    renderTeamsList();
    renderClubForm();
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
      toast('Anmeldung fehlgeschlagen: ' + err.message, 'error');
      document.getElementById('status-dot').className = 'status-dot offline';
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
    openTeamEditor,
    saveTeam,
    deleteTeam,
    saveClubInfo,
    closeModal
  };

})();
