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
                      <td style="text-align:center;color:var(--text-muted);">${s.games}</td>
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

    // ---- Chess piece SVGs ----
    const WK_BASE = 'https://upload.wikimedia.org/wikipedia/commons/';
    const PIECE_SVG = {
      wK: WK_BASE+'4/42/Chess_klt45.svg', wQ: WK_BASE+'1/15/Chess_qlt45.svg',
      wR: WK_BASE+'7/72/Chess_rlt45.svg', wB: WK_BASE+'b/b1/Chess_blt45.svg',
      wN: WK_BASE+'7/70/Chess_nlt45.svg', wP: WK_BASE+'4/45/Chess_plt45.svg',
      bK: WK_BASE+'f/f0/Chess_kdt45.svg', bQ: WK_BASE+'4/47/Chess_qdt45.svg',
      bR: WK_BASE+'f/ff/Chess_rdt45.svg', bB: WK_BASE+'9/98/Chess_bdt45.svg',
      bN: WK_BASE+'e/ef/Chess_ndt45.svg', bP: WK_BASE+'c/c7/Chess_pdt45.svg'
    };
    const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    // ---- Board logic ----
    function fenToBoard(fen) {
      const board = Array.from({length:8}, ()=>Array(8).fill(null));
      const rows = fen.split('/');
      for (let r=0; r<8; r++) {
        let c=0;
        for (const ch of rows[r]) {
          if (ch>='1'&&ch<='8') c+=parseInt(ch);
          else { board[r][c]={type:ch.toUpperCase(),color:ch===ch.toUpperCase()?'w':'b'}; c++; }
        }
      }
      return board;
    }
    function cloneBoard(b) { return b.map(r=>r.map(c=>c?{...c}:null)); }

    function findPiece(board, type, color, fromFile, fromRank, toR, toC) {
      for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = board[r][c];
        if (!p||p.type!==type||p.color!==color) continue;
        if (fromFile!==null&&c!==fromFile) continue;
        if (fromRank!==null&&r!==fromRank) continue;
        if (canReach(board,type,color,r,c,toR,toC)) return [r,c];
      }
      return null;
    }
    function canReach(board,type,color,fr,fc,tr,tc) {
      const dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc);
      switch(type) {
        case 'P': { const dir=color==='w'?-1:1;
          if(dc===0&&dr===dir&&!board[tr][tc]) return true;
          if(dc===0&&dr===2*dir&&fr===(color==='w'?6:1)&&!board[fr+dir][fc]&&!board[tr][tc]) return true;
          if(adc===1&&dr===dir) return true; return false; }
        case 'N': return (adr===2&&adc===1)||(adr===1&&adc===2);
        case 'B': return adr===adc&&adr>0&&pathClear(board,fr,fc,tr,tc);
        case 'R': return (dr===0||dc===0)&&(adr+adc>0)&&pathClear(board,fr,fc,tr,tc);
        case 'Q': return ((adr===adc)||(dr===0||dc===0))&&(adr+adc>0)&&pathClear(board,fr,fc,tr,tc);
        case 'K': return adr<=1&&adc<=1&&(adr+adc>0);
      } return false;
    }
    function pathClear(board,fr,fc,tr,tc) {
      const dr=Math.sign(tr-fr),dc=Math.sign(tc-fc);
      let r=fr+dr,c=fc+dc;
      while(r!==tr||c!==tc){if(board[r][c])return false;r+=dr;c+=dc;} return true;
    }

    // Apply a single SAN move to a board, return { board, from, to }
    function applyMove(board, san, turn) {
      let t = san.replace(/[+#!?]/g,'');
      const nb = cloneBoard(board);
      let fr,fc,tr,tc;

      if (t==='O-O-O'||t==='O-O') {
        const r=turn==='w'?7:0; const isQ=t==='O-O-O';
        nb[r][4]=null; nb[r][isQ?0:7]=null;
        nb[r][isQ?2:6]={type:'K',color:turn}; nb[r][isQ?3:5]={type:'R',color:turn};
        return { board:nb, from:{r,c:4}, to:{r,c:isQ?2:6} };
      }

      let promo=null; const pm=t.match(/=([QRBN])/);
      if(pm){promo=pm[1];t=t.replace(/=[QRBN]/,'');}
      let pieceType='P';
      if('KQRBN'.includes(t[0])){pieceType=t[0];t=t.substring(1);}
      tc=t.charCodeAt(t.length-2)-97; tr=8-parseInt(t[t.length-1]);
      t=t.substring(0,t.length-2).replace('x','');
      let fromFile=null,fromRank=null;
      for(const ch of t){if(ch>='a'&&ch<='h')fromFile=ch.charCodeAt(0)-97;else if(ch>='1'&&ch<='8')fromRank=8-parseInt(ch);}

      const src=findPiece(nb,pieceType,turn,fromFile,fromRank,tr,tc);
      if(src){
        if(pieceType==='P'&&src[1]!==tc&&!nb[tr][tc]) nb[src[0]][tc]=null;
        nb[src[0]][src[1]]=null;
        nb[tr][tc]={type:promo||pieceType,color:turn};
        fr=src[0];fc=src[1];
      } else { fr=0;fc=0; }
      return { board:nb, from:{r:fr,c:fc}, to:{r:tr,c:tc} };
    }

    // ---- PGN Tokenizer (preserves comments & variations) ----
    function tokenizePGN(pgn) {
      const tokens=[];let i=0;
      while(i<pgn.length) {
        if(/\s/.test(pgn[i])){i++;continue;}
        if(pgn[i]==='{'){let j=pgn.indexOf('}',i+1);if(j===-1)j=pgn.length;tokens.push({type:'comment',text:pgn.substring(i+1,j).trim()});i=j+1;continue;}
        if(pgn[i]==='('){tokens.push({type:'var-start'});i++;continue;}
        if(pgn[i]===')'){tokens.push({type:'var-end'});i++;continue;}
        if(pgn[i]==='$'){let j=i+1;while(j<pgn.length&&/\d/.test(pgn[j]))j++;const n=parseInt(pgn.substring(i+1,j));const s={1:'!',2:'?',3:'‼',4:'⁇',5:'⁉',6:'⁈',10:'=',14:'+=',15:'=+',16:'±',17:'∓',18:'+-',19:'-+'};tokens.push({type:'nag',text:s[n]||''});i=j;continue;}
        const rm=pgn.substring(i).match(/^(1-0|0-1|1\/2-1\/2|\*)/);
        if(rm){tokens.push({type:'result',text:rm[1]});i+=rm[1].length;continue;}
        if(/\d/.test(pgn[i])){let j=i;while(j<pgn.length&&/[\d.\s]/.test(pgn[j]))j++;i=j;continue;}
        const mm=pgn.substring(i).match(/^(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#!?]*)/);
        if(mm&&mm[1]){tokens.push({type:'move',san:mm[1]});i+=mm[1].length;continue;}
        i++;
      }
      return tokens;
    }

    // ---- Build position tree from tokens ----
    function buildGameTree(pgn) {
      const tokens = tokenizePGN(pgn);
      const startBoard = fenToBoard(INIT_FEN);

      // Flat array of position nodes
      // node.turn = whose move it is in THIS position (who moves next)
      const nodes = [{ board:cloneBoard(startBoard), move:null, san:null, comment:null, nag:null, parent:null, turn:'w', children:[] }];
      const mainLineIds = [0];

      const stack = [];
      let currentNodeId = 0;
      let turn = 'w';
      let depth = 0;

      for (const tok of tokens) {
        if (tok.type==='move') {
          const parentNode = nodes[currentNodeId];
          const result = applyMove(parentNode.board, tok.san, turn);
          const nextTurn = turn==='w'?'b':'w';
          const newId = nodes.length;
          nodes.push({ board:result.board, move:{from:result.from,to:result.to}, san:tok.san, comment:null, nag:null, parent:currentNodeId, turn:nextTurn, children:[] });
          parentNode.children.push(newId);
          if (depth===0) mainLineIds.push(newId);
          currentNodeId = newId;
          turn = nextTurn;
        }
        else if (tok.type==='comment') { nodes[currentNodeId].comment = tok.text; }
        else if (tok.type==='nag') { nodes[currentNodeId].nag = tok.text; }
        else if (tok.type==='var-start') {
          const parentId = nodes[currentNodeId].parent;
          if (parentId!==null) {
            stack.push({ savedNodeId:currentNodeId, savedTurn:turn });
            currentNodeId = parentId;
            turn = nodes[parentId].turn; // whose move at parent position
            depth++;
          }
        }
        else if (tok.type==='var-end') {
          if (stack.length>0) { const ctx=stack.pop(); currentNodeId=ctx.savedNodeId; turn=ctx.savedTurn; depth--; }
        }
      }

      // Build display tokens by walking the tree
      const displayTokens = [];

      function walkTree(parentId, d) {
        const parent = nodes[parentId];
        if (parent.children.length===0) return;
        const mainChildId = parent.children[0];
        const mainChild = nodes[mainChildId];

        displayTokens.push({ type:'move', nodeId:mainChildId, san:mainChild.san, isWhite:parent.turn==='w', depth:d });
        if (mainChild.nag) displayTokens.push({ type:'nag', text:mainChild.nag, depth:d });
        if (mainChild.comment) displayTokens.push({ type:'comment', text:mainChild.comment, depth:d });

        for (let vi=1; vi<parent.children.length; vi++) {
          displayTokens.push({ type:'var-start', depth:d+1 });
          walkVariation(parent.children[vi], d+1);
          displayTokens.push({ type:'var-end', depth:d+1 });
        }
        walkTree(mainChildId, d);
      }

      function walkVariation(nodeId, d) {
        const node = nodes[nodeId];
        const parentNode = nodes[node.parent];
        displayTokens.push({ type:'move', nodeId, san:node.san, isWhite:parentNode.turn==='w', depth:d });
        if (node.nag) displayTokens.push({ type:'nag', text:node.nag, depth:d });
        if (node.comment) displayTokens.push({ type:'comment', text:node.comment, depth:d });
        walkTree(nodeId, d);
      }

      walkTree(0, 0);
      return { nodes, mainLineIds, displayTokens };
    }

    // ---- Responsive Board Renderer ----
    function renderBoard(board, move) {
      // Site-themed board colors (navy/cream)
      const lightSq='#d9d0c1', darkSq='#2a4170';  // cream-ish / navy-light
      const lightHl='#7aa0cc', darkHl='#5a8abf';   // accent-blue highlight
      const arrowColor='rgba(196,92,92,0.88)';      // accent-red for arrow

      let html = '<div class="pgn-board-wrap">';

      // Rank labels + squares container (side by side)
      html += '<div class="pgn-board-frame">';

      // Rank labels column
      html += '<div class="pgn-rank-col">';
      for (let r=0; r<8; r++) html += `<div class="pgn-rank-label">${8-r}</div>`;
      html += '</div>';

      // Squares container (position:relative for SVG overlay)
      html += '<div class="pgn-squares-wrap">';
      html += '<div class="pgn-squares-grid">';
      for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
          const isLight=(r+c)%2===0;
          let bg=isLight?lightSq:darkSq;
          if(move&&((move.from.r===r&&move.from.c===c)||(move.to.r===r&&move.to.c===c)))
            bg=isLight?lightHl:darkHl;
          const piece=board[r][c];
          const img=piece?`<img src="${PIECE_SVG[piece.color+piece.type]}" alt="" class="pgn-piece">`:'';
          html+=`<div class="pgn-sq" style="background:${bg}">${img}</div>`;
        }
      }
      html += '</div>'; // close squares-grid

      // SVG arrow overlay (inside squares-wrap, covers exactly the 8x8 area)
      if (move) {
        const x1=move.from.c*12.5+6.25, y1=move.from.r*12.5+6.25;
        const x2=move.to.c*12.5+6.25, y2=move.to.r*12.5+6.25;
        // Shorten arrow slightly so tip doesn't overshoot center
        const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
        const shorten=1.8;
        const ax2=x2-dx/len*shorten, ay2=y2-dy/len*shorten;
        html+=`<svg class="pgn-arrow-svg" viewBox="0 0 100 100">
          <defs><marker id="ah" markerWidth="3.5" markerHeight="3" refX="3" refY="1.5" orient="auto">
            <polygon points="0 0,3.5 1.5,0 3" fill="${arrowColor}"/></marker></defs>
          <line x1="${x1}" y1="${y1}" x2="${ax2}" y2="${ay2}" stroke="${arrowColor}" stroke-width="1.4" stroke-linecap="round" marker-end="url(#ah)" opacity="0.85"/></svg>`;
      }

      html += '</div>'; // close squares-wrap
      html += '</div>'; // close board-frame

      // File labels row
      html += '<div class="pgn-file-row">';
      html += '<div class="pgn-file-spacer"></div>'; // spacer under rank labels
      for (let c=0; c<8; c++) html += `<div class="pgn-file-label">${'abcdefgh'[c]}</div>`;
      html += '</div>';

      html += '</div>'; // close board-wrap
      return html;
    }

    // ---- Build display move list HTML ----
    function buildMoveListHTML(displayTokens, activeNodeId) {
      let html='<div class="pgn-moves">';
      let plyCounter=0; // track for move numbers in main line (depth 0)
      let lastDepthWasVar = false;

      for (let i=0; i<displayTokens.length; i++) {
        const tok=displayTokens[i];

        if (tok.type==='var-start') {
          html+='<span class="pgn-variation">(';
          lastDepthWasVar = true;
          continue;
        }
        if (tok.type==='var-end') {
          html+=')</span> ';
          lastDepthWasVar = false;
          continue;
        }
        if (tok.type==='comment') {
          html+=`<span class="pgn-comment">{${tok.text}}</span> `;
          continue;
        }
        if (tok.type==='nag') {
          html+=`<span class="pgn-nag">${tok.text}</span>`;
          continue;
        }
        if (tok.type==='move') {
          const isActive = tok.nodeId === activeNodeId;

          // Move number
          if (tok.isWhite) {
            // Count which move number: find ply depth
            // For main line, compute from position in tree
            const node = parsed.nodes[tok.nodeId];
            let ply=0, cur=tok.nodeId;
            while(cur!==null && cur!==0){ cur=parsed.nodes[cur].parent; ply++; }
            const moveNum = Math.ceil(ply/2);
            html+=`<span class="pgn-movenum">${moveNum}.</span>`;
          } else if (lastDepthWasVar || (i>0 && displayTokens[i-1].type==='var-start')) {
            // After variation start, show move number with ...
            const node = parsed.nodes[tok.nodeId];
            let ply=0, cur=tok.nodeId;
            while(cur!==null && cur!==0){ cur=parsed.nodes[cur].parent; ply++; }
            const moveNum = Math.ceil(ply/2);
            html+=`<span class="pgn-movenum">${moveNum}…</span>`;
          }

          html+=`<span class="pgn-move-btn${isActive?' pgn-move-active':''}" data-node="${tok.nodeId}">${tok.san}</span> `;
          lastDepthWasVar = false;
        }
      }
      html+='</div>';
      return html;
    }

    // ---- Viewer state ----
    let currentGame=0, currentNodeId=0, parsed=null;

    function buildViewer() {
      const game=games[currentGame];
      parsed=buildGameTree(game.pgn);
      currentNodeId=0;

      container.innerHTML=`
        <div style="margin-bottom:1.25rem;">
          <select id="pgn-game-select" class="pgn-select">
            ${games.map((g,i)=>`<option value="${i}"${i===currentGame?' selected':''}>${g.title} (${g.result})</option>`).join('')}
          </select>
        </div>
        <div class="pgn-viewer-card">
          <div class="pgn-player-bar">
            <div><span class="pgn-player-white">⬜ ${game.white}</span>
              <span class="pgn-vs">vs</span>
              <span class="pgn-player-black">⬛ ${game.black}</span></div>
            <span class="pgn-result">${game.result}</span>
          </div>
          <div id="pgn-board-area" class="pgn-layout"></div>
        </div>`;
      updateBoard();

      document.getElementById('pgn-game-select').addEventListener('change',function(){currentGame=parseInt(this.value);buildViewer();});
      document.getElementById('pgn-first').addEventListener('click',()=>{currentNodeId=0;updateBoard();});
      document.getElementById('pgn-prev').addEventListener('click',()=>{
        const node=parsed.nodes[currentNodeId];
        if(node.parent!==null){currentNodeId=node.parent;updateBoard();}
      });
      document.getElementById('pgn-next').addEventListener('click',()=>{
        const node=parsed.nodes[currentNodeId];
        if(node.children.length>0){currentNodeId=node.children[0];updateBoard();}
      });
      document.getElementById('pgn-last').addEventListener('click',()=>{
        let c=currentNodeId;
        while(parsed.nodes[c].children.length>0) c=parsed.nodes[c].children[0];
        currentNodeId=c;updateBoard();
      });
    }

    function updateBoard() {
      const area=document.getElementById('pgn-board-area');
      if(!area) return;
      const node=parsed.nodes[currentNodeId];
      const boardHtml=renderBoard(node.board, node.move);
      const movesHtml=buildMoveListHTML(parsed.displayTokens, currentNodeId);

      // Board + controls in left column, moves in right column
      area.innerHTML=`
        <div class="pgn-board-col">
          ${boardHtml}
          <div class="pgn-controls">
            <button class="pgn-nav-btn" id="pgn-first" title="Anfang">⏮</button>
            <button class="pgn-nav-btn" id="pgn-prev" title="Zurück (←)">◀</button>
            <button class="pgn-nav-btn" id="pgn-next" title="Vor (→)">▶</button>
            <button class="pgn-nav-btn" id="pgn-last" title="Ende">⏭</button>
          </div>
          <div class="pgn-kb-hint">Pfeiltasten ← → zum Navigieren</div>
        </div>
        <div class="pgn-moves-col">${movesHtml}</div>`;

      // Re-bind nav buttons (they are re-created each updateBoard)
      document.getElementById('pgn-first').addEventListener('click',()=>{currentNodeId=0;updateBoard();});
      document.getElementById('pgn-prev').addEventListener('click',()=>{
        const n=parsed.nodes[currentNodeId]; if(n.parent!==null){currentNodeId=n.parent;updateBoard();}
      });
      document.getElementById('pgn-next').addEventListener('click',()=>{
        const n=parsed.nodes[currentNodeId]; if(n.children.length>0){currentNodeId=n.children[0];updateBoard();}
      });
      document.getElementById('pgn-last').addEventListener('click',()=>{
        let c=currentNodeId; while(parsed.nodes[c].children.length>0)c=parsed.nodes[c].children[0]; currentNodeId=c;updateBoard();
      });

      // Click handlers on moves
      area.querySelectorAll('.pgn-move-btn').forEach(el=>{
        el.addEventListener('click',()=>{currentNodeId=parseInt(el.dataset.node);updateBoard();});
      });

      // Scroll active move into view
      const active=area.querySelector('.pgn-move-active');
      if(active) active.scrollIntoView({block:'nearest',behavior:'smooth'});
    }

    // Keyboard navigation
    document.addEventListener('keydown',(e)=>{
      if(!parsed||!document.getElementById('pgn-board-area')) return;
      const node=parsed.nodes[currentNodeId];
      if(e.key==='ArrowLeft'){e.preventDefault();if(node.parent!==null){currentNodeId=node.parent;updateBoard();}}
      if(e.key==='ArrowRight'){e.preventDefault();if(node.children.length>0){currentNodeId=node.children[0];updateBoard();}}
      if(e.key==='Home'){e.preventDefault();currentNodeId=0;updateBoard();}
      if(e.key==='End'){e.preventDefault();let c=currentNodeId;while(parsed.nodes[c].children.length>0)c=parsed.nodes[c].children[0];currentNodeId=c;updateBoard();}
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
