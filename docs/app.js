/* ===== SC Ostertal – Main Site JavaScript ===== */

// ── Content Loading ──
async function loadContent() {
  try {
    const res = await fetch('content.json?t=' + Date.now());
    const data = await res.json();
    renderNews(data.neuigkeiten || []);
    renderTermine(data.termine || []);
    renderTeams(data.mannschaften || []);
    renderKontakt(data);
    renderHero(data);
  } catch (e) {
    console.error('Fehler beim Laden der Inhalte:', e);
  }
}

// ── Hero ──
function renderHero(data) {
  const desc = document.getElementById('heroDescription');
  if (desc && data.ueber_uns) {
    desc.textContent = data.ueber_uns;
  }
}

// ── News ──
function renderNews(news) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const sorted = [...news].sort((a, b) => new Date(b.datum) - new Date(a.datum));
  grid.innerHTML = sorted.map(n => `
    <article class="news-card animate-on-scroll">
      <div class="news-meta">
        <span class="news-date">${formatDate(n.datum)}</span>
        <span class="news-author">${escHtml(n.autor)}</span>
      </div>
      <h3>${escHtml(n.titel)}</h3>
      <p>${escHtml(n.inhalt)}</p>
    </article>
  `).join('');
  observeAnimations();
}

// ── Termine ──
function renderTermine(termine) {
  const list = document.getElementById('termineList');
  if (!list) return;
  const now = new Date();
  const upcoming = [...termine]
    .filter(t => new Date(t.datum) >= new Date(now.toISOString().split('T')[0]))
    .sort((a, b) => new Date(a.datum) - new Date(b.datum));

  list.innerHTML = (upcoming.length ? upcoming : termine.slice(0, 4)).map(t => {
    const d = new Date(t.datum + 'T00:00:00');
    const tag = d.getDate();
    const monat = d.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase();
    return `
      <div class="termin-item animate-on-scroll">
        <div class="termin-datum">
          <div class="termin-tag">${tag}</div>
          <div class="termin-monat">${monat}</div>
        </div>
        <div class="termin-info">
          <h4>${escHtml(t.titel)}</h4>
          <div class="termin-details">${escHtml(t.ort)} · ${escHtml(t.beschreibung)}</div>
        </div>
        <div class="termin-zeit">${escHtml(t.zeit)} Uhr</div>
      </div>
    `;
  }).join('');
  observeAnimations();
}

// ── Mannschaften ──
function renderTeams(teams) {
  const grid = document.getElementById('teamsGrid');
  if (!grid) return;
  grid.innerHTML = teams.map(t => `
    <div class="team-card animate-on-scroll">
      <div class="team-header">
        <h3>${escHtml(t.name)}</h3>
        <div class="team-liga">${escHtml(t.liga)}</div>
      </div>
      <div class="team-body">
        <div class="team-kapitaen">Kapitän: ${escHtml(t.kapitaen)}</div>
        <ul class="team-spieler">
          ${t.spieler.map(s => `<li>${escHtml(s)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
  observeAnimations();
}

// ── Kontakt ──
function renderKontakt(data) {
  const adresse = document.getElementById('kontaktAdresse');
  const training = document.getElementById('kontaktTraining');
  const email = document.getElementById('kontaktEmail');
  if (adresse && data.adresse) adresse.textContent = data.adresse;
  if (training && data.trainingszeiten) training.textContent = data.trainingszeiten;
  if (email && data.email) {
    email.textContent = data.email;
    email.href = 'mailto:' + data.email;
  }
}

// ── Chessboard Deco ──
function renderChessboard() {
  const board = document.getElementById('chessboard');
  if (!board) return;
  // Starting position pieces (unicode)
  const pieces = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['' ,'' ,'' ,'' ,'' ,'' ,'' ,'' ],
    ['' ,'' ,'' ,'' ,'' ,'' ,'' ,'' ],
    ['' ,'' ,'' ,'' ,'' ,'' ,'' ,'' ],
    ['' ,'' ,'' ,'' ,'' ,'' ,'' ,'' ],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖'],
  ];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.textContent = pieces[r][c];
      board.appendChild(sq);
    }
  }
}

// ── Navigation ──
function toggleNav() {
  document.getElementById('mainNav').classList.toggle('open');
}

// Close mobile nav on link click
document.querySelectorAll('#mainNav a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('mainNav').classList.remove('open');
  });
});

// Header scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// ── Scroll Animations ──
function observeAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => {
    observer.observe(el);
  });
}

// ── Contact Form (placeholder, since GH Pages has no backend) ──
function sendContact() {
  const name = document.getElementById('cfName').value.trim();
  const email = document.getElementById('cfEmail').value.trim();
  const msg = document.getElementById('cfMessage').value.trim();

  if (!name || !email || !msg) {
    alert('Bitte fülle alle Felder aus.');
    return;
  }

  // Open mail client as fallback for static hosting
  const subject = encodeURIComponent('Kontakt über Webseite – ' + name);
  const body = encodeURIComponent(`Name: ${name}\nE-Mail: ${email}\n\n${msg}`);
  window.location.href = `mailto:info@sc-ostertal.de?subject=${subject}&body=${body}`;
}

// ── Helpers ──
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  renderChessboard();
  loadContent();
  observeAnimations();
});
