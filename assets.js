/* ===================== STATE ===================== */
let game = new Chess();
let mode = 'pvp';            // 'pvp' | 'ai'
let humanColor = 'w';        // when mode === 'ai'
let difficulty = 'medium';
let boardFlipped = false;
let selectedSquare = null;
let legalTargets = [];       // verbose move objects from selected square
let lastMove = null;         // {from, to}
let soundOn = true;
let aiThinking = false;
let pendingPromotion = null; // {from, to}
let gameStartedAt = null;
let gameSaved = false;

const PIECE_GLYPH = {
  wp:'\u265F', wn:'\u265E', wb:'\u265D', wr:'\u265C', wq:'\u265B', wk:'\u265A',
  bp:'\u265F', bn:'\u265E', bb:'\u265D', br:'\u265C', bq:'\u265B', bk:'\u265A'
};

/* ===================== SOUND ENGINE ===================== */
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function tone(freq, duration, type, gainVal, delay){
  if (!soundOn) return;
  const ctx = ensureAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.value = gainVal || 0.06;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t0 = ctx.currentTime + (delay || 0);
  osc.start(t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.stop(t0 + duration + 0.02);
}
const sfx = {
  move: () => tone(520, 0.09, 'triangle', 0.07),
  capture: () => { tone(180, 0.12, 'square', 0.07); tone(120, 0.14, 'square', 0.05, 0.03); },
  select: () => tone(760, 0.05, 'sine', 0.04),
  check: () => { tone(880, 0.12, 'sawtooth', 0.05); tone(660, 0.12, 'sawtooth', 0.05, 0.08); },
  gameOver: () => { tone(440,0.18,'triangle',0.06); tone(330,0.2,'triangle',0.06,0.15); tone(220,0.3,'triangle',0.07,0.32); }
};

/* ===================== AI WORKER ===================== */
const AI_WORKER_SRC = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const VALUES = { p:100, n:320, b:330, r:500, q:900, k:20000 };

const PST = {
  p:[ 0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
      5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
      5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 ],
  n:[ -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40,
      -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
      -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 ],
  b:[ -20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10,
      -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
      -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20 ],
  r:[ 0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0 ],
  q:[ -20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10,
      -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10,
      -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20 ],
  k:[ -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
      20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20 ]
};

function sq_index(square){
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  return { file, rank };
}

function pstValue(piece, square, color){
  const { file, rank } = sq_index(square);
  const idx = color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file;
  return PST[piece][idx];
}

function evaluate(chess){
  if (chess.in_checkmate()) return chess.turn() === 'w' ? -99999 : 99999;
  if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) return 0;

  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++){
    for (let f = 0; f < 8; f++){
      const cell = board[r][f];
      if (!cell) continue;
      const file = String.fromCharCode(97 + f);
      const rank = 8 - r;
      const square = file + rank;
      const val = VALUES[cell.type] + pstValue(cell.type, square, cell.color);
      score += cell.color === 'w' ? val : -val;
    }
  }
  return score;
}

function orderMoves(moves){
  return moves.slice().sort((a, b) => {
    const av = a.captured ? (VALUES[a.captured] * 10 - VALUES[a.piece]) : 0;
    const bv = b.captured ? (VALUES[b.captured] * 10 - VALUES[b.piece]) : 0;
    return (bv + (Math.random() * 2)) - (av + (Math.random() * 2));
  });
}

let nodeDeadline = 0;
function timeUp(){ return Date.now() > nodeDeadline; }

function minimax(chess, depth, alpha, beta, maximizing){
  if (depth === 0 || chess.game_over() || timeUp()){
    return { score: evaluate(chess) };
  }
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) return { score: evaluate(chess) };

  let best = null;
  if (maximizing){
    let value = -Infinity;
    for (const m of moves){
      chess.move(m.san);
      const res = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (res.score > value){ value = res.score; best = m; }
      alpha = Math.max(alpha, value);
      if (beta <= alpha || timeUp()) break;
    }
    return { score: value, move: best };
  } else {
    let value = Infinity;
    for (const m of moves){
      chess.move(m.san);
      const res = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (res.score < value){ value = res.score; best = m; }
      beta = Math.min(beta, value);
      if (beta <= alpha || timeUp()) break;
    }
    return { score: value, move: best };
  }
}

function pickMove(fen, difficulty){
  const chess = new Chess(fen);
  const maximizing = chess.turn() === 'w';
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;

  if (difficulty === 'easy'){
    nodeDeadline = Date.now() + 300;
    if (Math.random() < 0.35){
      return legal[Math.floor(Math.random() * legal.length)];
    }
    const result = minimax(chess, 1, -Infinity, Infinity, maximizing);
    return result.move || legal[0];
  }

  if (difficulty === 'medium'){
    nodeDeadline = Date.now() + 600;
    const result = minimax(chess, 2, -Infinity, Infinity, maximizing);
    return result.move || legal[0];
  }

  if (difficulty === 'hard'){
    nodeDeadline = Date.now() + 1500;
    const result = minimax(chess, 3, -Infinity, Infinity, maximizing);
    return result.move || legal[0];
  }

  // Grandmaster / Master Level: Search depth ditingkatkan hingga Depth 5-6
  nodeDeadline = Date.now() + 3000;
  let bestSoFar = legal[0];
  for (let d = 1; d <= 6; d++){
    if (timeUp()) break;
    const result = minimax(chess, d, -Infinity, Infinity, maximizing);
    if (result.move) bestSoFar = result.move;
  }
  return bestSoFar;
}

self.onmessage = function(e){
  const { fen, difficulty } = e.data;
  const move = pickMove(fen, difficulty);
  self.postMessage(move ? { from: move.from, to: move.to, promotion: move.promotion || 'q' } : null);
};
`;

let aiWorker = null;
function getAiWorker(){
  if (aiWorker) return aiWorker;
  const blob = new Blob([AI_WORKER_SRC], { type: 'application/javascript' });
  aiWorker = new Worker(URL.createObjectURL(blob));
  return aiWorker;
}

function requestAiMove(){
  aiThinking = true;
  $('#statusIndicator').text('Komputer sedang berpikir…');
  const worker = getAiWorker();
  worker.onmessage = function(e){
    aiThinking = false;
    const mv = e.data;
    if (!mv) { $('#statusIndicator').text(''); return; }
    setTimeout(() => {
      applyMove(mv.from, mv.to, mv.promotion);
    }, 150);
  };
  worker.postMessage({ fen: game.fen(), difficulty });
}

/* ===================== RENDERING ===================== */
function squareName(row, col){
  // row 0..7 top->bottom as displayed, col 0..7 left->right as displayed
  const file = boardFlipped ? 7 - col : col;
  const rank = boardFlipped ? row : 7 - row;
  return String.fromCharCode(97 + file) + (rank + 1);
}

function renderBoard(){
  const $board = $('#board');
  $board.empty();

  const inCheck = game.in_check();
  const kingSquare = inCheck ? findKingSquare(game.turn()) : null;

  for (let row = 0; row < 8; row++){
    for (let col = 0; col < 8; col++){
      const sq = squareName(row, col);
      const isLight = (row + col) % 2 === 0;
      const $sq = $('<div>')
        .addClass('square')
        .addClass(isLight ? 'light' : 'dark')
        .attr('data-square', sq);

      if (col === 0){
        $sq.append($('<span>').addClass('coord rank').text(sq[1]));
      }
      if (row === 7){
        $sq.append($('<span>').addClass('coord file').text(sq[0]));
      }

      if (lastMove && (sq === lastMove.from || sq === lastMove.to)){
        $sq.addClass('last-move');
      }
      if (selectedSquare === sq){
        $sq.addClass('selected');
      }
      if (kingSquare === sq){
        $sq.addClass('check-glow');
      }

      const piece = game.get(sq);
      if (piece){
        const key = piece.color + piece.type;
        const $piece = $('<div>')
          .addClass('piece')
          .addClass(piece.color === 'w' ? 'white-piece' : 'black-piece')
          .attr('draggable', true)
          .attr('data-square', sq)
          .text(PIECE_GLYPH[key]);
        $sq.append($piece);
      }

      const target = legalTargets.find(m => m.to === sq);
      if (target){
        $sq.append($('<div>').addClass('move-dot' + (target.captured ? ' capture' : '')));
      }

      $board.append($sq);
    }
  }
}

function findKingSquare(color){
  const board = game.board();
  for (let r = 0; r < 8; r++){
    for (let f = 0; f < 8; f++){
      const cell = board[r][f];
      if (cell && cell.type === 'k' && cell.color === color){
        const file = String.fromCharCode(97 + f);
        const rank = 8 - r;
        return file + rank;
      }
    }
  }
  return null;
}

function renderCaptured(){
  const history = game.history({ verbose: true });
  const byWhite = []; // pieces white has captured (black pieces)
  const byBlack = [];
  history.forEach(m => {
    if (m.captured){
      const glyph = PIECE_GLYPH[(m.color === 'w' ? 'b' : 'w') + m.captured];
      if (m.color === 'w') byWhite.push(glyph); else byBlack.push(glyph);
    }
  });
  $('#capturedByWhite').html(byWhite.map(g => `<span class="cap-piece" style="color:#151519">${g}</span>`).join(''));
  $('#capturedByBlack').html(byBlack.map(g => `<span class="cap-piece" style="color:#f7f6f2">${g}</span>`).join(''));
}

function renderMoveList(){
  const history = game.history();
  let html = '';
  for (let i = 0; i < history.length; i += 2){
    const num = i / 2 + 1;
    const white = history[i] || '';
    const black = history[i + 1] || '';
    html += `<div class="flex gap-2"><span class="text-white/30 w-6">${num}.</span><span class="w-16">${white}</span><span class="text-white/70">${black}</span></div>`;
  }
  const $list = $('#moveList');
  $list.html(html);
  $list.scrollTop($list[0] ? $list[0].scrollHeight : 0);
}

function updateStatusBar(){
  const turnColor = game.turn() === 'w' ? 'Putih' : 'Hitam';
  $('#turnIndicator').text('Giliran: ' + turnColor);

  if (game.in_checkmate()){
    $('#statusIndicator').text('Skak mat!');
  } else if (game.in_check()){
    $('#statusIndicator').text('Skak!');
  } else if (game.in_stalemate()){
    $('#statusIndicator').text('Buntu (stalemate)');
  } else if (game.in_draw()){
    $('#statusIndicator').text('Seri');
  } else {
    $('#statusIndicator').text(aiThinking ? 'Komputer sedang berpikir…' : '');
  }
}

/* ===================== GAME FLOW ===================== */
function isHumanTurn(){
  if (mode === 'pvp') return true;
  return game.turn() === humanColor;
}

function clearSelection(){
  selectedSquare = null;
  legalTargets = [];
}

function selectSquare(sq){
  const piece = game.get(sq);
  if (!piece || piece.color !== game.turn()) return;
  selectedSquare = sq;
  legalTargets = game.moves({ square: sq, verbose: true });
  sfx.select();
  renderBoard();
}

function needsPromotion(from, to){
  const moves = game.moves({ square: from, verbose: true });
  return moves.some(m => m.to === to && m.flags.includes('p'));
}

function applyMove(from, to, promotion){
  const $targetSq = $('.square[data-square="' + to + '"]');
  const $capturedPiece = $targetSq.find('.piece');

  // Jika ada bidak yang dimakan, jalankan animasi mengecil/memudar dulu
  if ($capturedPiece.length > 0) {
    $capturedPiece.addClass('capturing');
  }

  // Beri sedikit delay micro (40ms) agar animasi captured terlihat mulus sebelum papan di-render ulang
  setTimeout(() => {
    const wasCapture = !!game.get(to);
    const move = game.move({ from, to, promotion: promotion || 'q' });
    if (!move) return false;

    lastMove = { from, to };
    clearSelection();

    if (move.captured) sfx.capture(); else sfx.move();

    renderBoard();
    renderCaptured();
    renderMoveList();
    updateStatusBar();

    // Tambahkan class animasi pop pada bidak yang baru saja mendarat
    const $movedPiece = $('.square[data-square="' + to + '"] .piece');
    $movedPiece.addClass('just-moved');
    setTimeout(() => $movedPiece.removeClass('just-moved'), 300);

    if (game.in_check() && !game.game_over()) sfx.check();

    if (game.game_over()){
      handleGameOver();
      return true;
    }

    if (mode === 'ai' && isHumanTurn() === false){
      requestAiMove();
    }
  }, $capturedPiece.length > 0 ? 120 : 0);

  return true;
}

function attemptMove(from, to){
  if (needsPromotion(from, to)){
    pendingPromotion = { from, to };
    showPromotionModal();
    return;
  }
  applyMove(from, to);
}

function showPromotionModal(){
  const color = game.turn();
  const options = ['q', 'r', 'b', 'n'];
  const $choices = $('#promoChoices').empty();
  options.forEach(p => {
    const glyph = PIECE_GLYPH[color + p];
    $('<button>').addClass('btn hairline border rounded-lg py-3 text-3xl bg-white/5 hover:bg-white/15')
      .css('color', color === 'w' ? '#f7f6f2' : '#151519')
      .css('text-shadow', color === 'w' ? '0 0 10px rgba(255,255,255,0.6)' : '0 0 8px rgba(255,255,255,0.4)')
      .text(glyph)
      .on('click', () => {
        $('#promoModal').removeClass('flex').addClass('hidden');
        const { from, to } = pendingPromotion;
        pendingPromotion = null;
        applyMove(from, to, p);
      })
      .appendTo($choices);
  });
  $('#promoModal').removeClass('hidden').addClass('flex');
}

function handleGameOver(){
  let title = 'Permainan Selesai';
  let subtitle = '';
  let resultForHuman = 'draw';

  if (game.in_checkmate()){
    const winner = game.turn() === 'w' ? 'b' : 'w';
    title = 'Skak Mat';
    subtitle = (winner === 'w' ? 'Putih' : 'Hitam') + ' menang';
    if (mode === 'ai') resultForHuman = winner === humanColor ? 'win' : 'loss';
    else resultForHuman = winner === 'w' ? 'win' : 'loss';
  } else if (game.in_stalemate()){
    title = 'Buntu';
    subtitle = 'Seri — tidak ada langkah legal';
  } else if (game.in_threefold_repetition()){
    title = 'Seri';
    subtitle = 'Pengulangan posisi tiga kali';
  } else if (game.insufficient_material()){
    title = 'Seri';
    subtitle = 'Bahan tidak cukup untuk skak mat';
  } else if (game.in_draw()){
    title = 'Seri';
    subtitle = 'Aturan 50 langkah';
  }

  $('#overTitle').text(title);
  $('#overSubtitle').text(subtitle);
  $('#overModal').removeClass('hidden').addClass('flex');
  sfx.gameOver();

  saveMatchResult(resultForHuman);
}

/* ===================== PERSISTENCE ===================== */
function saveMatchResult(result){
  if (gameSaved) return;
  gameSaved = true;
  const payload = {
    player_name: $('#playerName').val() || 'Anonim',
    mode: mode,
    difficulty: mode === 'ai' ? difficulty : null,
    result: result,
    moves_count: game.history().length,
    duration_seconds: gameStartedAt ? Math.round((Date.now() - gameStartedAt) / 1000) : 0,
    pgn: game.pgn()
  };

  if (DB_AVAILABLE){
    $.ajax({
      url: 'api.php?action=save_result',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload)
    });
  } else {
    const stats = JSON.parse(localStorage.getItem('chessLocalStats') || '{}');
    const name = payload.player_name;
    if (!stats[name]) stats[name] = { wins: 0, losses: 0, draws: 0 };
    if (result === 'win') stats[name].wins++;
    else if (result === 'loss') stats[name].losses++;
    else stats[name].draws++;
    localStorage.setItem('chessLocalStats', JSON.stringify(stats));
  }
}

function loadLeaderboard(){
  const $content = $('#leaderContent');
  $content.html('<p class="text-white/40 text-sm">Memuat…</p>');

  if (DB_AVAILABLE){
    $.getJSON('api.php?action=leaderboard', function(res){
      if (!res.ok || !res.data || res.data.length === 0){
        $content.html('<p class="text-white/40 text-sm">Belum ada data pertandingan.</p>');
        return;
      }
      renderLeaderboardTable(res.data.map(r => ({ name: r.player_name, wins: +r.wins, losses: +r.losses, draws: +r.draws })));
    }).fail(() => $content.html('<p class="text-white/40 text-sm">Gagal memuat papan peringkat.</p>'));
  } else {
    const stats = JSON.parse(localStorage.getItem('chessLocalStats') || '{}');
    const rows = Object.keys(stats).map(name => ({ name, ...stats[name] }));
    if (rows.length === 0){
      $content.html('<p class="text-white/40 text-sm">Belum ada data pertandingan (tersimpan lokal di peramban ini).</p>');
      return;
    }
    rows.sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws));
    renderLeaderboardTable(rows);
  }
}

function renderLeaderboardTable(rows){
  let html = '<table class="w-full text-left"><thead><tr class="text-white/40 text-xs uppercase"><th class="pb-2">Nama</th><th class="pb-2 text-center">M</th><th class="pb-2 text-center">K</th><th class="pb-2 text-center">S</th></tr></thead><tbody>';
  rows.forEach(r => {
    html += `<tr class="border-t hairline"><td class="py-2">${$('<div>').text(r.name).html()}</td><td class="text-center">${r.wins}</td><td class="text-center">${r.losses}</td><td class="text-center">${r.draws}</td></tr>`;
  });
  html += '</tbody></table>';
  $('#leaderContent').html(html);
}

/* ===================== CONTROLS ===================== */
function startNewGame(){
  game = new Chess();
  clearSelection();
  lastMove = null;
  gameStartedAt = Date.now();
  gameSaved = false;
  aiThinking = false;
  $('#overModal').removeClass('flex').addClass('hidden');

  if (mode === 'ai'){
    boardFlipped = humanColor === 'b';
  }

  renderBoard();
  renderCaptured();
  renderMoveList();
  updateStatusBar();

  if (mode === 'ai' && humanColor === 'b'){
    requestAiMove();
  }
}

$(function(){
  renderBoard();

  function openSidebar(){
    $('#sidebar').addClass('open');
    $('#sidebarBackdrop').addClass('open');
  }
  function closeSidebar(){
    $('#sidebar').removeClass('open');
    $('#sidebarBackdrop').removeClass('open');
  }

  $('#btnFullscreen').on('click', function(){
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Masuk mode Fullscreen
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) { /* Safari */
        docEl.webkitRequestFullscreen();
      }
      $('#iconExpand').addClass('hidden');
      $('#iconCompress').removeClass('hidden');
    } else {
      // Keluar dari mode Fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      }
      $('#iconCompress').addClass('hidden');
      $('#iconExpand').removeClass('hidden');
    }
  });

  // Listener jika pengguna keluar fullscreen menggunakan tombol ESC bawaan browser
  $(document).on('fullscreenchange webkitfullscreenchange', function(){
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    $('#iconExpand').toggleClass('hidden', isFS);
    $('#iconCompress').toggleClass('hidden', !isFS);
  });
  
  $('#btnMenuToggle').on('click', openSidebar);
  $('#btnMenuClose').on('click', closeSidebar);
  $('#sidebarBackdrop').on('click', closeSidebar);
  $('#btnStart').on('click', closeSidebar);

  $('.mode-btn').on('click', function(){
    $('.mode-btn').removeClass('bg-white/10').addClass('bg-white/0');
    $(this).addClass('bg-white/10').removeClass('bg-white/0');
    mode = $(this).data('mode');
    $('#aiOptions').toggleClass('hidden', mode !== 'ai');
  });

  $('.color-btn').on('click', function(){
    $('.color-btn').removeClass('bg-white/10').addClass('bg-white/0');
    $(this).addClass('bg-white/10').removeClass('bg-white/0');
    humanColor = $(this).data('color');
  });

  $('#difficulty').on('change', function(){ difficulty = $(this).val(); });

  $('#btnStart').on('click', startNewGame);

  $('#btnUndo').on('click', function(){
    if (aiThinking) return;
    game.undo();
    if (mode === 'ai' && game.history().length > 0 && game.turn() !== humanColor){
      game.undo();
    }
    clearSelection();
    lastMove = null;
    renderBoard();
    renderCaptured();
    renderMoveList();
    updateStatusBar();
  });

  $('#btnFlip').on('click', function(){
    boardFlipped = !boardFlipped;
    renderBoard();
  });

  $('#soundToggle').on('change', function(){ soundOn = this.checked; });
  $('#tiltToggle').on('change', function(){ $('#boardTilt').toggleClass('flat', !this.checked); });

  $('#board').on('click', '.square', function(e){
    if (aiThinking || pendingPromotion) return;
    if (!isHumanTurn()) return;
    const sq = $(this).attr('data-square');

    if (selectedSquare && legalTargets.some(m => m.to === sq)){
      attemptMove(selectedSquare, sq);
      return;
    }
    if (sq === selectedSquare){
      clearSelection();
      renderBoard();
      return;
    }
    selectSquare(sq);
  });

  $('#board').on('dragstart', '.piece', function(e){
    if (aiThinking || pendingPromotion) return;
    const sq = $(this).attr('data-square');
    if (!isHumanTurn()){ e.preventDefault(); return; }
    const piece = game.get(sq);
    if (!piece || piece.color !== game.turn()){ e.preventDefault(); return; }
    selectSquare(sq);
    e.originalEvent.dataTransfer.setData('text/plain', sq);
    $(this).addClass('dragging');
  });
  $('#board').on('dragend', '.piece', function(){ $(this).removeClass('dragging'); });
  $('#board').on('dragover', '.square', function(e){ e.preventDefault(); });
  $('#board').on('drop', '.square', function(e){
    e.preventDefault();
    if (aiThinking || pendingPromotion) return;
    const from = e.originalEvent.dataTransfer.getData('text/plain');
    const to = $(this).attr('data-square');
    if (from && legalTargets.some(m => m.to === to)){
      attemptMove(from, to);
    }
  });

  $('#overRematch').on('click', function(){
    $('#overModal').removeClass('flex').addClass('hidden');
    startNewGame();
  });
  $('#overClose').on('click', function(){ $('#overModal').removeClass('flex').addClass('hidden'); });

  $('#btnLeaderboard').on('click', function(){
    $('#leaderModal').removeClass('hidden').addClass('flex');
    loadLeaderboard();
  });
  $('#leaderClose').on('click', function(){ $('#leaderModal').removeClass('flex').addClass('hidden'); });

  $('#btnHowTo').on('click', function(){ $('#howtoModal').removeClass('hidden').addClass('flex'); });
  $('#howtoClose').on('click', function(){ $('#howtoModal').removeClass('flex').addClass('hidden'); });

  gameStartedAt = Date.now();
});