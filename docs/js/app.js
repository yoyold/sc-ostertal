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
    if (upcoming.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine anstehenden Termine.</p>';
      return;
    }

    container.innerHTML = upcoming.map(item => {
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
    container.innerHTML = teams.map(team => {
      const playersHtml = team.players.map(p => {
        if (typeof p === 'string') return `<li>${p}</li>`;
        return `<li><span class="team-player-board">Brett ${p.board}</span><span class="team-player-name">${p.name}</span></li>`;
      }).join('');
      const linkHtml = team.season_url
        ? `<a href="${team.season_url}" target="_blank" class="tournament-ext-link" style="margin-top:0.75rem;display:inline-block;">↗ Aufstellung beim SSV</a>`
        : '';
      return `
        <div class="team-card fade-in">
          <div class="team-header">
            <h3>${team.name}</h3>
            <span class="team-league">${team.league}</span>
          </div>
          <ul class="team-players team-players-roster">
            ${playersHtml}
          </ul>
          ${linkHtml}
        </div>`;
    }).join('');
    requestAnimationFrame(initScrollAnimations);
  }

  function renderLeagues(data) {
    const container = document.getElementById('leagues-container');
    if (!container) return;
    const leagues = data.leagues;
    if (!leagues || leagues.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Ligadaten vorhanden.</p>';
      return;
    }
    container.innerHTML = leagues.map(league => `
      <div class="tournament-card fade-in">
        <div class="tournament-card-header">
          <div>
            <h3 class="tournament-card-title">${league.name} – ${league.our_team}</h3>
            <p class="tournament-card-type">Saison ${league.season}</p>
          </div>
          ${league.external_url ? `<div class="tournament-links"><a href="${league.external_url}" target="_blank" class="tournament-ext-link">↗ Tabelle beim SSV</a></div>` : ''}
        </div>
        <table class="tournament-table">
          <thead>
            <tr>
              <th style="text-align:left;">#</th>
              <th style="text-align:left;">Mannschaft</th>
              <th style="text-align:center;" title="Spiele">Sp.</th>
              <th style="text-align:center;" title="Siege">S</th>
              <th style="text-align:center;" title="Unentschieden">U</th>
              <th style="text-align:center;" title="Niederlagen">N</th>
              <th style="text-align:center;" title="Mannschaftspunkte">MP</th>
              <th style="text-align:center;" title="Brettpunkte">BP</th>
            </tr>
          </thead>
          <tbody>
            ${league.standings.map(s => `
              <tr${s.our_team ? ' class="league-our-team"' : ''}>
                <td class="tournament-rank">${s.rank}</td>
                <td${s.our_team ? ' style="font-weight:600;"' : ''}>${s.team}</td>
                <td style="text-align:center;color:var(--text-secondary);">${s.games}</td>
                <td style="text-align:center;">${s.wins}</td>
                <td style="text-align:center;">${s.draws}</td>
                <td style="text-align:center;">${s.losses}</td>
                <td style="text-align:center;font-family:var(--font-mono);font-weight:600;">${s.mp}</td>
                <td style="text-align:center;font-family:var(--font-mono);color:var(--text-secondary);">${s.bp}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
    requestAnimationFrame(initScrollAnimations);
  }

  function renderDWZ(data) {
    const container = document.getElementById('dwz-container');
    if (!container) return;
    const list = data.dwz_list;
    if (!list || list.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine DWZ-Daten vorhanden.</p>';
      return;
    }
    container.innerHTML = `
      <table class="tournament-table">
        <thead>
          <tr>
            <th style="text-align:left;">#</th>
            <th style="text-align:left;">Name</th>
            <th style="text-align:center;">DWZ</th>
            <th style="text-align:center;">Elo</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(p => `
            <tr>
              <td class="tournament-rank">${p.rank}</td>
              <td>${p.name}</td>
              <td style="text-align:center;font-family:var(--font-mono);">${p.dwz !== null ? p.dwz : '–'}</td>
              <td style="text-align:center;font-family:var(--font-mono);color:var(--text-secondary);">${p.elo !== null ? p.elo : '–'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-muted);">
        Quelle: <a href="https://www.schachbund.de/verein/90034.html" target="_blank" style="color:var(--accent-blue-light);text-decoration:none;">Deutscher Schachbund – Vereinsseite SC Ostertal</a>
      </p>`;
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
    if (email && club.email) email.innerHTML = emailGuard(club.email);

    const founded = document.getElementById('info-founded');
    if (founded && club.founded) founded.textContent = club.founded;
  }

  function renderTournaments(data) {
    const tournaments = data.tournaments;
    if (!tournaments) return;

    // Helper: render round results table
    function renderRounds(rounds) {
      if (!rounds || rounds.length === 0) return '';
      return `
        <div class="tournament-rounds">
          <h4 class="tournament-rounds-title">Rundenergebnisse</h4>
          <div class="tournament-rounds-list">
            ${rounds.map((rd, i) => `
              <details class="tournament-round-detail"${i === rounds.length - 1 ? ' open' : ''}>
                <summary class="tournament-round-summary">
                  <span>Runde ${rd.round}</span>
                  ${rd.date ? `<span class="tournament-round-date">${rd.date}</span>` : ''}
                </summary>
                <div class="tournament-round-games">
                  ${(rd.games || []).map(g => `
                    <div class="tournament-round-game">
                      <span class="tournament-round-player">${g.white}</span>
                      <span class="tournament-round-result">${g.result}</span>
                      <span class="tournament-round-player">${g.black}</span>
                    </div>
                  `).join('')}
                </div>
              </details>
            `).join('')}
          </div>
        </div>`;
    }

    // Helper: render screenshots gallery
    function renderScreenshots(screenshots) {
      if (!screenshots || screenshots.length === 0) return '';
      return `
        <div class="tournament-screenshots">
          <h4 class="tournament-screenshots-title">Impressionen</h4>
          <div class="tournament-screenshots-grid">
            ${screenshots.map(s => `
              <a href="${s.url}" target="_blank" class="tournament-screenshot-link">
                <img src="${s.url}" alt="${s.caption || 'Turnierbild'}" class="tournament-screenshot-img" loading="lazy">
                ${s.caption ? `<span class="tournament-screenshot-caption">${s.caption}</span>` : ''}
              </a>
            `).join('')}
          </div>
        </div>`;
    }

    // Helper: render external links
    function renderLinks(tournament) {
      const links = [];
      if (tournament.external_url) links.push({ url: tournament.external_url, label: tournament.external_label || 'Turnier-Seite' });
      if (tournament.links) tournament.links.forEach(l => links.push(l));
      if (links.length === 0) return '';
      return `
        <div class="tournament-links">
          ${links.map(l => `<a href="${l.url}" target="_blank" class="tournament-ext-link">↗ ${l.label}</a>`).join('')}
        </div>`;
    }

    // Current tournaments
    const currentContainer = document.getElementById('current-tournaments');
    if (currentContainer) {
      const current = tournaments.current || [];
      if (current.length === 0) {
        currentContainer.innerHTML = '<p style="color:var(--text-muted)">Keine laufenden Turniere.</p>';
      } else {
        currentContainer.innerHTML = current.map(t => `
          <div class="tournament-card fade-in">
            <div class="tournament-card-header">
              <div>
                <h3 class="tournament-card-title">${t.name}</h3>
                <p class="tournament-card-type">${t.type}</p>
                <p class="tournament-card-date">${t.date_range}</p>
              </div>
              ${renderLinks(t)}
            </div>
            ${t.standings && t.standings.length > 0 ? `
              <table class="tournament-table">
                <thead>
                  <tr>
                    <th style="text-align:left;">#</th>
                    <th style="text-align:left;">Spieler</th>
                    <th style="text-align:center;">Punkte</th>
                    <th style="text-align:center;">Partien</th>
                  </tr>
                </thead>
                <tbody>
                  ${t.standings.map(s => `
                    <tr>
                      <td class="tournament-rank">${s.rank}</td>
                      <td>${s.player}</td>
                      <td style="text-align:center;font-family:var(--font-mono);">${s.points}</td>
                      <td style="text-align:center;color:var(--text-secondary);">${s.games}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
            ${renderRounds(t.rounds)}
            ${renderScreenshots(t.screenshots)}
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
          <details class="tournament-archive-item fade-in">
            <summary class="tournament-archive-summary">
              <div>
                <strong style="font-family:var(--font-display);">${t.name}</strong>
                <span class="tournament-archive-date">${t.date_range}</span>
              </div>
              <div class="tournament-archive-meta">
                ${t.winner ? `<span class="tournament-archive-winner">🏆 ${t.winner}</span>` : ''}
                ${renderLinks(t)}
              </div>
            </summary>
            <div class="tournament-archive-body">
              <p class="tournament-card-type">${t.type}</p>
              ${t.standings && t.standings.length > 0 ? `
                <table class="tournament-table tournament-table-sm">
                  <thead>
                    <tr>
                      <th style="text-align:left;">#</th>
                      <th style="text-align:left;">Spieler</th>
                      <th style="text-align:center;">Punkte</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${t.standings.map(s => `
                      <tr>
                        <td class="tournament-rank">${s.rank}</td>
                        <td>${s.player}</td>
                        <td style="text-align:center;font-family:var(--font-mono);">${s.points}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:var(--text-muted);font-size:0.85rem;">Keine Ergebnisse hinterlegt.</p>'}
              ${renderRounds(t.rounds)}
              ${renderScreenshots(t.screenshots)}
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
          ${c.email ? `<p style="font-size:0.9rem;">${emailGuard(c.email)}</p>` : ''}
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
        <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:1.5rem;">Angaben gemäß § 5 DDG</h2>
        <p style="margin-bottom:0.5rem;"><strong>${imp.verein || ''}</strong></p>
        ${imp.address ? `<p style="color:var(--text-secondary);margin-bottom:1rem;">${imp.address}</p>` : ''}
        ${imp.responsible ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Verantwortlich</span><p>${imp.responsible}</p></div>` : ''}
        ${imp.email ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Kontakt</span><p>${emailGuard(imp.email)}</p></div>` : ''}
        ${imp.register ? `<div style="margin-bottom:1rem;"><span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Register</span><p style="color:var(--text-secondary);">${imp.register}</p></div>` : ''}
        ${imp.extra ? `<div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);color:var(--text-secondary);font-size:0.92rem;">${imp.extra}</div>` : ''}
      </div>
    `;
  }

  // ===== E-Mail-Schutz =====
  // E-Mail-Adressen sind in content.json rückwärts gespeichert und werden nur
  // optisch (CSS bidi-override) richtig herum angezeigt. So steht die echte
  // Adresse nie im Quelltext/DOM und ist für Harvester nicht lesbar. Der
  // Mailto-Link wird erst beim Klick zusammengebaut.

  function revEmail(s) { return (s || '').split('').reverse().join(''); }

  function emailGuard(reversedEmail) {
    if (!reversedEmail) return '';
    return `<span class="email-guard" role="link" tabindex="0" title="Klicken, um eine E-Mail zu schreiben">${reversedEmail}</span>`;
  }

  document.addEventListener('click', (e) => {
    const guard = e.target.closest && e.target.closest('.email-guard');
    if (guard) window.location.href = 'mailto:' + revEmail(guard.textContent.trim());
  });
  document.addEventListener('copy', (e) => {
    const sel = window.getSelection();
    if (sel && sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('.email-guard')) {
      e.preventDefault();
    }
  });

  // ===== Contact Form =====

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    // Formular-Ziel erst zur Laufzeit setzen, damit die Adresse nicht im HTML steht
    if (form.dataset.fs) form.action = 'https://formsubmit.co/' + revEmail(form.dataset.fs);
    // Rückkehr von FormSubmit: Erfolgsmeldung anzeigen
    if (new URLSearchParams(window.location.search).get('gesendet') === '1') {
      const statusEl = document.getElementById('form-status');
      if (statusEl) {
        statusEl.textContent = 'Vielen Dank! Deine Nachricht wurde gesendet.';
        statusEl.style.color = 'var(--accent-green)';
      }
    }
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
    renderLeagues,
    renderDWZ,
    renderClubInfo,
    renderTournaments,
    renderContacts,
    renderImpressum,
    initContactForm
  };

})();
