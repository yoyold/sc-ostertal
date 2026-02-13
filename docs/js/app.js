/* ===== SC Ostertal – Main Application ===== */

window.SCO = (function () {
  'use strict';

  const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function parseDate(dateStr) {
    const d = new Date(dateStr);
    return {
      day: d.getDate(),
      month: MONTHS_DE[d.getMonth()],
      year: d.getFullYear()
    };
  }

  // ===== Data Loading =====

  let _dataCache = null;

  async function load() {
    if (_dataCache) return _dataCache;
    const response = await fetch('content.json');
    if (!response.ok) throw new Error('Content not found');
    _dataCache = await response.json();
    return _dataCache;
  }

  // ===== Scroll Animations =====

  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  }

  // ===== Render Functions =====

  function renderNews(data) {
    const container = document.getElementById('news-container');
    if (!container) return;
    const news = data.news;
    if (!news || news.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Neuigkeiten vorhanden.</p>';
      return;
    }
    const sorted = [...news].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(item => `
      <article class="news-card fade-in">
        <div class="news-meta">
          <span class="news-date">${formatDate(item.date)}</span>
          ${item.author ? `<span class="news-author">${item.author}</span>` : ''}
        </div>
        <h3>${item.title}</h3>
        <p>${item.content}</p>
      </article>
    `).join('');
    requestAnimationFrame(initScrollAnimations);
  }

  function renderEvents(data) {
    const container = document.getElementById('events-container');
    if (!container) return;
    const events = data.events;
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine anstehenden Termine.</p>';
      return;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = [...events]
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const toRender = upcoming.length > 0 ? upcoming : [...events].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = toRender.map(item => {
      const d = parseDate(item.date);
      return `
        <div class="event-item fade-in">
          <div class="event-date-block">
            <div class="event-day">${d.day}</div>
            <div class="event-month">${d.month} ${d.year}</div>
            ${item.time ? `<div class="event-time-badge">${item.time} Uhr</div>` : ''}
          </div>
          <div class="event-details">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
        </div>
      `;
    }).join('');
    requestAnimationFrame(initScrollAnimations);
  }

  function renderTeams(data) {
    const container = document.getElementById('teams-container');
    if (!container) return;
    const teams = data.teams;
    if (!teams || teams.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Mannschaften eingetragen.</p>';
      return;
    }
    container.innerHTML = teams.map(team => `
      <div class="team-card fade-in">
        <div class="team-header">
          <h3>${team.name}</h3>
          <span class="team-league">${team.league}</span>
        </div>
        <ul class="team-players">
          ${team.players.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    requestAnimationFrame(initScrollAnimations);
  }

  function renderClubInfo(data) {
    const club = data.club;
    if (!club) return;

    const motto = document.getElementById('hero-motto');
    if (motto && club.motto) motto.textContent = club.motto;

    const about = document.getElementById('about-text');
    if (about && club.about) about.textContent = club.about;

    const training = document.getElementById('info-training');
    if (training && club.training) training.textContent = club.training;

    const address = document.getElementById('info-address');
    if (address && club.address) address.textContent = club.address;

    const email = document.getElementById('info-email');
    if (email && club.email) email.innerHTML = `<a href="mailto:${club.email}">${club.email}</a>`;

    const founded = document.getElementById('info-founded');
    if (founded && club.founded) founded.textContent = club.founded;
  }

  function renderTournaments(data) {
    const tournaments = data.tournaments;
    if (!tournaments) return;

    // Current tournaments
    const currentContainer = document.getElementById('current-tournaments');
    if (currentContainer) {
      const current = tournaments.current || [];
      if (current.length === 0) {
        currentContainer.innerHTML = '<p style="color:var(--text-muted)">Keine laufenden Turniere.</p>';
      } else {
        currentContainer.innerHTML = current.map(t => `
          <div class="tournament-card fade-in" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 2rem;margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <h3 style="font-family:var(--font-display);font-size:1.2rem;">${t.name}</h3>
              ${t.external_url ? `<a href="${t.external_url}" target="_blank" style="color:var(--accent-blue);font-size:0.85rem;">Extern →</a>` : ''}
            </div>
            <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:0.3rem;">${t.type}</p>
            <p style="color:var(--text-muted);font-size:0.82rem;font-family:var(--font-mono);margin-bottom:1rem;">${t.date_range}</p>
            ${t.standings && t.standings.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;">
                    <th style="padding:8px 12px;text-align:left;">#</th>
                    <th style="padding:8px 12px;text-align:left;">Spieler</th>
                    <th style="padding:8px 12px;text-align:center;">Punkte</th>
                    <th style="padding:8px 12px;text-align:center;">Partien</th>
                  </tr>
                </thead>
                <tbody>
                  ${t.standings.map(s => `
                    <tr style="border-bottom:1px solid rgba(30,45,72,0.3);">
                      <td style="padding:8px 12px;color:var(--accent-blue);font-weight:600;">${s.rank}</td>
                      <td style="padding:8px 12px;">${s.player}</td>
                      <td style="padding:8px 12px;text-align:center;font-family:var(--font-mono);">${s.points}</td>
                      <td style="padding:8px 12px;text-align:center;color:var(--text-muted);">${s.games}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `).join('');
      }
    }

    // Archive
    const archiveContainer = document.getElementById('tournament-archive');
    if (archiveContainer) {
      const archive = tournaments.archive || [];
      if (archive.length === 0) {
        archiveContainer.innerHTML = '<p style="color:var(--text-muted)">Kein Archiv vorhanden.</p>';
      } else {
        archiveContainer.innerHTML = archive.map(t => `
          <details class="fade-in" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:0.75rem;">
            <summary style="padding:1.25rem 1.5rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;list-style:none;">
              <div>
                <strong style="font-family:var(--font-display);">${t.name}</strong>
                <span style="color:var(--text-muted);font-size:0.85rem;margin-left:1rem;">${t.date_range}</span>
              </div>
              ${t.winner ? `<span style="color:var(--accent-blue);font-size:0.85rem;font-family:var(--font-mono);">🏆 ${t.winner}</span>` : ''}
            </summary>
            <div style="padding:0 1.5rem 1.25rem;">
              <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:0.75rem;">${t.type}</p>
              ${t.standings && t.standings.length > 0 ? `
                <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                  <thead>
                    <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;">
                      <th style="padding:6px 12px;text-align:left;">#</th>
                      <th style="padding:6px 12px;text-align:left;">Spieler</th>
                      <th style="padding:6px 12px;text-align:center;">Punkte</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${t.standings.map(s => `
                      <tr style="border-bottom:1px solid rgba(30,45,72,0.3);">
                        <td style="padding:6px 12px;color:var(--accent-blue);">${s.rank}</td>
                        <td style="padding:6px 12px;">${s.player}</td>
                        <td style="padding:6px 12px;text-align:center;font-family:var(--font-mono);">${s.points}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:var(--text-muted);font-size:0.85rem;">Keine Ergebnisse hinterlegt.</p>'}
            </div>
          </details>
        `).join('');
      }
    }
    requestAnimationFrame(initScrollAnimations);
  }

  function renderContacts(data) {
    const container = document.getElementById('contacts-container');
    if (!container) return;
    const contacts = data.contacts || [];
    if (contacts.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Kontakte hinterlegt.</p>';
      return;
    }
    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;">` +
      contacts.map(c => `
        <div class="fade-in" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 2rem;">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:0.3rem;">${c.name}</h3>
          <p style="color:var(--accent-blue);font-size:0.85rem;font-family:var(--font-mono);margin-bottom:0.75rem;">${c.role}</p>
          ${c.email ? `<p style="font-size:0.9rem;"><a href="mailto:${c.email}" style="color:var(--accent-blue-light);text-decoration:none;">${c.email}</a></p>` : ''}
          ${c.phone ? `<p style="font-size:0.9rem;color:var(--text-secondary);">${c.phone}</p>` : ''}
        </div>
      `).join('') + '</div>';
    requestAnimationFrame(initScrollAnimations);
  }

  function renderImpressum(data) {
    const container = document.getElementById('impressum-content');
    if (!container) return;
    const imp = data.impressum;
    if (!imp) {
      container.innerHTML = '<p style="color:var(--text-muted)">Kein Impressum hinterlegt.</p>';
      return;
    }
    container.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;max-width:640px;">
        <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:1.5rem;">Angaben gemäß § 5 TMG</h2>
        <p style="margin-bottom:0.5rem;"><strong>${imp.verein || ''}</strong></p>
        ${imp.address ? `<p style="color:var(--text-secondary);margin-bottom:1rem;">${imp.address}</p>` : ''}
        ${imp.responsible ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Verantwortlich</span><p>${imp.responsible}</p></div>` : ''}
        ${imp.email ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Kontakt</span><p><a href="mailto:${imp.email}" style="color:var(--accent-blue-light);text-decoration:none;">${imp.email}</a></p></div>` : ''}
        ${imp.register ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Register</span><p style="color:var(--text-secondary);">${imp.register}</p></div>` : ''}
        ${imp.extra ? `<div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--text-secondary);font-size:0.92rem;">${imp.extra}</div>` : ''}
      </div>
    `;
  }

  // ===== PGN Viewer =====

  function renderPGNViewer(data) {
    const container = document.getElementById('pgn-viewer');
    if (!container) return;
    const games = data.pgn_games || [];
    if (games.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Partien hinterlegt.</p>';
      return;
    }

    // Build game selector + viewer
    let html = `<div style="margin-bottom:1.5rem;">
      <select id="pgn-game-select" style="width:100%;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font-body);font-size:0.95rem;">
        ${games.map((g, i) => `<option value="${i}">${g.title} (${g.result})</option>`).join('')}
      </select>
    </div>
    <div id="pgn-board" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;"></div>`;
    container.innerHTML = html;

    function showGame(index) {
      const game = games[index];
      const moves = game.pgn.split(/\d+\.\s*/).filter(Boolean).map(m => m.trim());
      const boardDiv = document.getElementById('pgn-board');
      boardDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <span style="color:var(--text-primary);font-weight:600;">⬜ ${game.white}</span>
            <span style="color:var(--text-muted);margin:0 0.5rem;">vs</span>
            <span style="color:var(--text-primary);font-weight:600;">⬛ ${game.black}</span>
          </div>
          <span style="font-family:var(--font-mono);color:var(--accent-blue);font-size:0.9rem;">${game.result}</span>
        </div>
        <div style="font-family:var(--font-mono);font-size:0.9rem;line-height:2;color:var(--text-secondary);white-space:pre-wrap;">${game.pgn}</div>
        <div style="margin-top:1rem;color:var(--text-muted);font-size:0.82rem;">${formatDate(game.date)}</div>
      `;
    }

    showGame(0);
    document.getElementById('pgn-game-select').addEventListener('change', function () {
      showGame(parseInt(this.value));
    });
  }

  // ===== Sub-Tabs (Schach page) =====

  function initSubTabs() {
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.sub;
        document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('sub-' + target);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // ===== Contact Form =====

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      const statusEl = document.getElementById('form-status');
      // Let formsubmit.co handle it – just show a message
      if (statusEl) {
        statusEl.textContent = 'Nachricht wird gesendet…';
        statusEl.style.color = 'var(--accent-blue)';
      }
    });
  }

  // ===== Mobile Nav Toggle =====

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
      toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }

    document.addEventListener('click', (e) => {
      if (navLinks && navLinks.classList.contains('open') && !e.target.closest('.nav-inner')) {
        navLinks.classList.remove('open');
      }
      if (e.target.closest('.nav-links a') && navLinks) {
        navLinks.classList.remove('open');
      }
    });
  });

  // ===== Public API =====

  return {
    load,
    renderNews,
    renderEvents,
    renderTeams,
    renderClubInfo,
    renderTournaments,
    renderContacts,
    renderImpressum,
    renderPGNViewer,
    initSubTabs,
    initContactForm
  };

})();
