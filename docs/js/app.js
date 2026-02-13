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

    // ---- Minimal chess engine for PGN replay ----
    const PIECES = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
    const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    function fenToBoard(fen) {
      const board = Array.from({length:8}, ()=>Array(8).fill(null));
      const rows = fen.split('/');
      for (let r=0; r<8; r++) {
        let c=0;
        for (const ch of rows[r]) {
          if (ch>='1'&&ch<='8') { c+=parseInt(ch); }
          else { board[r][c]={ type:ch.toUpperCase(), color:ch===ch.toUpperCase()?'w':'b' }; c++; }
        }
      }
      return board;
    }

    function cloneBoard(b) { return b.map(r=>r.map(c=>c?{...c}:null)); }

    function findPiece(board, type, color, fromFile, fromRank, toR, toC) {
      const candidates = [];
      for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = board[r][c];
        if (!p || p.type!==type || p.color!==color) continue;
        if (fromFile!==null && c!==fromFile) continue;
        if (fromRank!==null && r!==fromRank) continue;
        if (canReach(board, type, color, r, c, toR, toC)) candidates.push([r,c]);
      }
      return candidates[0] || null;
    }

    function canReach(board, type, color, fr, fc, tr, tc) {
      const dr=tr-fr, dc=tc-fc, adr=Math.abs(dr), adc=Math.abs(dc);
      switch(type) {
        case 'P': {
          const dir = color==='w'?-1:1;
          if (dc===0 && dr===dir && !board[tr][tc]) return true;
          if (dc===0 && dr===2*dir && fr===(color==='w'?6:1) && !board[fr+dir][fc] && !board[tr][tc]) return true;
          if (adc===1 && dr===dir) return true; // capture or en passant
          return false;
        }
        case 'N': return (adr===2&&adc===1)||(adr===1&&adc===2);
        case 'B': return adr===adc && adr>0 && pathClear(board,fr,fc,tr,tc);
        case 'R': return (dr===0||dc===0) && (adr+adc>0) && pathClear(board,fr,fc,tr,tc);
        case 'Q': return ((adr===adc)||(dr===0||dc===0)) && (adr+adc>0) && pathClear(board,fr,fc,tr,tc);
        case 'K': return adr<=1 && adc<=1 && (adr+adc>0);
      }
      return false;
    }

    function pathClear(board, fr, fc, tr, tc) {
      const dr=Math.sign(tr-fr), dc=Math.sign(tc-fc);
      let r=fr+dr, c=fc+dc;
      while(r!==tr||c!==tc) { if(board[r][c]) return false; r+=dr; c+=dc; }
      return true;
    }

    function parsePGN(pgn) {
      // Extract individual move tokens
      const clean = pgn.replace(/\{[^}]*\}/g,'').replace(/\([^)]*\)/g,'');
      const tokens = clean.match(/(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g) || [];

      const positions = [cloneBoard(fenToBoard(INIT_FEN))];
      const moveLabels = [];
      let board = cloneBoard(positions[0]);
      let turn = 'w';

      for (const tok of tokens) {
        let t = tok.replace(/[+#]/g,'');
        const nb = cloneBoard(board);

        // Castling
        if (t==='O-O-O'||t==='O-O') {
          const r = turn==='w'?7:0;
          const isQ = t==='O-O-O';
          nb[r][4]=null;
          nb[r][isQ?0:7]=null;
          nb[r][isQ?2:6]={type:'K',color:turn};
          nb[r][isQ?3:5]={type:'R',color:turn};
          positions.push(cloneBoard(nb));
          moveLabels.push(tok);
          board = nb; turn = turn==='w'?'b':'w';
          continue;
        }

        // Promotion
        let promo = null;
        const promoMatch = t.match(/=([QRBN])/);
        if (promoMatch) { promo=promoMatch[1]; t=t.replace(/=[QRBN]/,''); }

        // Piece type
        let pieceType = 'P';
        if ('KQRBN'.includes(t[0])) { pieceType=t[0]; t=t.substring(1); }

        // Target square (last two chars)
        const targetFile = t.charCodeAt(t.length-2)-97;
        const targetRank = 8-parseInt(t[t.length-1]);
        t = t.substring(0, t.length-2).replace('x','');

        // Disambiguation
        let fromFile=null, fromRank=null;
        for (const ch of t) {
          if (ch>='a'&&ch<='h') fromFile=ch.charCodeAt(0)-97;
          else if (ch>='1'&&ch<='8') fromRank=8-parseInt(ch);
        }

        const from = findPiece(nb, pieceType, turn, fromFile, fromRank, targetRank, targetFile);
        if (from) {
          // En passant capture
          if (pieceType==='P' && from[1]!==targetFile && !nb[targetRank][targetFile]) {
            nb[from[0]][targetFile] = null;
          }
          nb[from[0]][from[1]] = null;
          nb[targetRank][targetFile] = { type: promo||pieceType, color: turn };
        }

        positions.push(cloneBoard(nb));
        moveLabels.push(tok);
        board = nb; turn = turn==='w'?'b':'w';
      }

      return { positions, moveLabels };
    }

    function renderBoard(board, lastMove) {
      const lightSq = '#c8b07a';
      const darkSq = '#8b6b3d';
      const lightHl = '#d4c46a';
      const darkHl = '#a09030';
      let html = '<div style="display:inline-grid;grid-template-columns:auto repeat(8,1fr);grid-template-rows:repeat(8,1fr) auto;border:2px solid var(--border);border-radius:4px;overflow:hidden;font-size:0;">';

      for (let r=0; r<8; r++) {
        // Rank label
        html += `<div style="display:flex;align-items:center;justify-content:center;width:24px;font-size:12px;color:var(--text-muted);font-family:var(--font-mono);">${8-r}</div>`;
        for (let c=0; c<8; c++) {
          const isLight = (r+c)%2===0;
          let bg = isLight ? lightSq : darkSq;
          if (lastMove && ((lastMove[0]===r&&lastMove[1]===c)||(lastMove[2]===r&&lastMove[3]===c))) {
            bg = isLight ? lightHl : darkHl;
          }
          const piece = board[r][c];
          const sym = piece ? PIECES[piece.color==='w'?piece.type:piece.type.toLowerCase()] : '';
          html += `<div style="width:clamp(36px,8vw,56px);height:clamp(36px,8vw,56px);background:${bg};display:flex;align-items:center;justify-content:center;font-size:clamp(24px,5.5vw,38px);line-height:1;user-select:none;">${sym}</div>`;
        }
      }
      // File labels
      html += '<div style="width:24px;"></div>';
      for (let c=0; c<8; c++) {
        html += `<div style="display:flex;align-items:center;justify-content:center;height:22px;font-size:12px;color:var(--text-muted);font-family:var(--font-mono);">${'abcdefgh'[c]}</div>`;
      }
      html += '</div>';
      return html;
    }

    // ---- Build viewer UI ----
    let currentGame = 0;
    let currentMove = 0;
    let parsed = null;

    function buildViewer() {
      const game = games[currentGame];
      parsed = parsePGN(game.pgn);
      currentMove = 0;

      container.innerHTML = `
        <div style="margin-bottom:1.25rem;">
          <select id="pgn-game-select" style="width:100%;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font-body);font-size:0.95rem;">
            ${games.map((g,i)=>`<option value="${i}"${i===currentGame?' selected':''}>${g.title} (${g.result})</option>`).join('')}
          </select>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <div>
              <span style="font-weight:600;">⬜ ${game.white}</span>
              <span style="color:var(--text-muted);margin:0 0.5rem;">vs</span>
              <span style="font-weight:600;">⬛ ${game.black}</span>
            </div>
            <span style="font-family:var(--font-mono);color:var(--accent-blue);font-size:0.9rem;">${game.result}</span>
          </div>
          <div id="pgn-board-area" style="display:flex;flex-wrap:wrap;gap:1.5rem;align-items:flex-start;"></div>
          <div style="display:flex;gap:8px;margin-top:1rem;justify-content:center;">
            <button class="pgn-nav-btn" id="pgn-first" title="Anfang">⏮</button>
            <button class="pgn-nav-btn" id="pgn-prev" title="Zurück (←)">◀</button>
            <button class="pgn-nav-btn" id="pgn-next" title="Vor (→)">▶</button>
            <button class="pgn-nav-btn" id="pgn-last" title="Ende">⏭</button>
          </div>
          <div style="color:var(--text-muted);font-size:0.78rem;text-align:center;margin-top:0.5rem;">Pfeiltasten ← → zum Navigieren</div>
        </div>
      `;
      updateBoard();

      document.getElementById('pgn-game-select').addEventListener('change', function() {
        currentGame = parseInt(this.value);
        buildViewer();
      });
      document.getElementById('pgn-first').addEventListener('click', ()=>{ currentMove=0; updateBoard(); });
      document.getElementById('pgn-prev').addEventListener('click',  ()=>{ if(currentMove>0){currentMove--;updateBoard();} });
      document.getElementById('pgn-next').addEventListener('click',  ()=>{ if(currentMove<parsed.positions.length-1){currentMove++;updateBoard();} });
      document.getElementById('pgn-last').addEventListener('click',  ()=>{ currentMove=parsed.positions.length-1; updateBoard(); });
    }

    function updateBoard() {
      const area = document.getElementById('pgn-board-area');
      if (!area) return;

      // Determine last move highlight
      let lastMove = null;
      // We can't easily track from/to without storing it, skip highlight for simplicity

      const boardHtml = renderBoard(parsed.positions[currentMove], lastMove);

      // Build move list with current move highlighted
      let movesHtml = '<div style="font-family:var(--font-mono);font-size:0.85rem;line-height:1.9;max-height:380px;overflow-y:auto;flex:1;min-width:180px;">';
      for (let i=0; i<parsed.moveLabels.length; i++) {
        if (i%2===0) movesHtml += `<span style="color:var(--text-muted);margin-right:4px;">${Math.floor(i/2)+1}.</span>`;
        const isActive = i+1===currentMove;
        movesHtml += `<span class="pgn-move${isActive?' pgn-move-active':''}" data-move="${i+1}" style="cursor:pointer;padding:2px 5px;border-radius:3px;${isActive?'background:var(--navy-light);color:var(--cream-light);':''}">${parsed.moveLabels[i]}</span> `;
        if (i%2===1) movesHtml += '<br>';
      }
      movesHtml += '</div>';

      area.innerHTML = `<div>${boardHtml}</div>${movesHtml}`;

      // Click on moves
      area.querySelectorAll('.pgn-move').forEach(el => {
        el.addEventListener('click', () => {
          currentMove = parseInt(el.dataset.move);
          updateBoard();
        });
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!parsed || !document.getElementById('pgn-board-area')) return;
      if (e.key==='ArrowLeft') { e.preventDefault(); if(currentMove>0){currentMove--;updateBoard();} }
      if (e.key==='ArrowRight') { e.preventDefault(); if(currentMove<parsed.positions.length-1){currentMove++;updateBoard();} }
      if (e.key==='Home') { e.preventDefault(); currentMove=0; updateBoard(); }
      if (e.key==='End') { e.preventDefault(); currentMove=parsed.positions.length-1; updateBoard(); }
    });

    buildViewer();
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
