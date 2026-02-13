/* ===== SC Ostertal – Main Application ===== */

(function () {
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

  // ===== Render Functions =====

  function renderNews(news) {
    const container = document.getElementById('news-container');
    if (!news || news.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine Neuigkeiten vorhanden.</p>';
      return;
    }

    // Sort by date descending
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
  }

  function renderEvents(events) {
    const container = document.getElementById('events-container');
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Keine anstehenden Termine.</p>';
      return;
    }

    // Sort by date ascending, filter future events
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = [...events]
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const toRender = upcoming.length > 0 ? upcoming : events.sort((a, b) => new Date(b.date) - new Date(a.date));

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
  }

  function renderTeams(teams) {
    const container = document.getElementById('teams-container');
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
  }

  function renderClubInfo(club) {
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

  // ===== Load Content =====

  async function loadContent() {
    try {
      const response = await fetch('content.json');
      if (!response.ok) throw new Error('Content not found');
      const data = await response.json();

      renderClubInfo(data.club);
      renderNews(data.news);
      renderEvents(data.events);
      renderTeams(data.teams);

      // Trigger scroll animations after rendering
      requestAnimationFrame(initScrollAnimations);
    } catch (err) {
      console.error('Error loading content:', err);
      document.querySelectorAll('.loading-spinner').forEach(el => {
        el.innerHTML = '<p style="color:var(--text-muted)">Inhalte konnten nicht geladen werden.</p>';
      });
    }
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

  // ===== Mobile Nav =====

  document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks.classList.contains('open') && !e.target.closest('.nav-inner')) {
      navLinks.classList.remove('open');
    }
    // Close on link click
    if (e.target.closest('.nav-links a')) {
      navLinks.classList.remove('open');
    }
  });

  // ===== Footer Year =====
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // ===== Init =====
  loadContent();

})();
