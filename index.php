<?php
require_once __DIR__ . '/config.php';
$dbAvailable = get_db_connection() !== null;
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
<title>Catur Pro — Obsidian &amp; Ivory</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<!-- Icon Kuda Catur FontAwesome (CDN) -->
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path d='M320 32C426 32 512 118 512 224L512 357.5C512 374.5 505.2 390.7 493.3 402.7L448 448L498.8 498.7C507.3 507.2 512 518.7 512 530.7C512 555.7 491.7 575.9 466.8 576L173.3 576C148.3 576 128.1 555.7 128.1 530.7C128.1 518.7 132.9 507.2 141.3 498.7L192 448L192 413.4C192 394.7 200.2 377 214.3 364.8L304 288L256 288L243.9 300.1C231.2 312.8 213.9 320 195.9 320C158.4 320 128 289.6 128 252.1L128 243.4C128 220.6 136.2 198.5 151.1 181.1L224 96L224 64C224 46.3 238.3 32 256 32L320 32zM288 136C274.7 136 264 146.7 264 160C264 173.3 274.7 184 288 184C301.3 184 312 173.3 312 160C312 146.7 301.3 136 288 136z'/></svg>">
<style>
  :root{
    --ivory:#eeece4;
    --ivory-dim:#c9c6ba;
    --obsidian:#0a0a0e;
    --obsidian-2:#121218;
    --panel:#111116;
    --panel-line:rgba(238,236,228,0.08);
    --glow-white:rgba(255,255,255,0.85);
    --glow-soft:rgba(238,236,228,0.35);
  }
  *{box-sizing:border-box;}
  body{
    background:
      radial-gradient(1200px 700px at 50% -10%, #1b1b22 0%, var(--obsidian) 55%, #000 100%);
    color:var(--ivory);
    font-family:'Inter',sans-serif;
    min-height:100vh;
  }
  .font-display{font-family:'Cinzel',serif;}
  .tracking-tightish{letter-spacing:0.01em;}

  .hairline{border-color:var(--panel-line);}
  .panel{
    background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
    border:1px solid var(--panel-line);
    backdrop-filter:blur(6px);
  }
  .board-stage{
    perspective:1500px;
    perspective-origin:50% 20%;
  }
  .board-tilt{
    transform:rotateX(20deg);
    transform-style:preserve-3d;
    transition:transform .5s ease;
  }
  .board-tilt.flat{ transform:rotateX(0deg); }

  .board{
    display:grid;
    grid-template-columns:repeat(8,1fr);
    grid-template-rows:repeat(8,1fr);
    width:min(90vw,720px);
    aspect-ratio:1/1;
    transform-style:preserve-3d;
    box-shadow:
      0 40px 80px -20px rgba(0,0,0,0.8),
      0 0 90px -10px rgba(255,255,255,0.06);
    border-radius:6px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,0.12);
  }
  .square{
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
    user-select:none;
  }
  .square.light{ background:linear-gradient(155deg,#e9e7df,#cfccc2); }
  .square.dark{ background:linear-gradient(155deg,#242429,#131316); }
  .square.dark::before{
    content:'';
    position:absolute;inset:0;
    box-shadow:inset 0 0 22px rgba(0,0,0,0.55);
  }
  .square.light::before{
    content:'';
    position:absolute;inset:0;
    box-shadow:inset 0 0 16px rgba(255,255,255,0.35);
  }

  .coord{
    position:absolute;
    font-size:9px;
    font-weight:600;
    opacity:0.55;
    pointer-events:none;
  }
  .coord.file{ right:3px; bottom:2px; }
  .coord.rank{ left:3px; top:2px; }
  .square.light .coord{ color:#3a3a3a; }
  .square.dark .coord{ color:#cfcfcf; }

  .square.selected::after{
    content:'';
    position:absolute;inset:3px;
    border:2px solid rgba(255,255,255,0.95);
    border-radius:4px;
    box-shadow:0 0 16px 2px rgba(255,255,255,0.65), inset 0 0 10px rgba(255,255,255,0.4);
    pointer-events:none;
  }
  .square.last-move{ background-color:rgba(255,255,255,0.10); }
  .square.last-move::after{
    content:'';
    position:absolute;inset:0;
    background:rgba(255,255,255,0.08);
    pointer-events:none;
  }
  .square.check-glow::after{
    content:'';
    position:absolute;inset:0;
    box-shadow:inset 0 0 0 3px rgba(255,255,255,0.9), 0 0 26px 6px rgba(255,255,255,0.55);
    animation:pulseCheck 1s ease-in-out infinite;
    pointer-events:none;
  }
  @keyframes pulseCheck{
    0%,100%{ opacity:0.55; }
    50%{ opacity:1; }
  }

  .move-dot{
    position:absolute;
    width:22%;
    height:22%;
    border-radius:50%;
    background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15) 70%);
    box-shadow:0 0 10px 2px rgba(255,255,255,0.55);
    pointer-events:none;
  }
  .move-dot.capture{
    width:100%;height:100%;
    border-radius:0;
    background:none;
    box-shadow:inset 0 0 0 3px rgba(255,255,255,0.85), 0 0 18px 2px rgba(255,255,255,0.4);
  }

  .piece{
    position:relative;
    font-size:min(9.5vw,58px);
    line-height:1;
    cursor:grab;
    transform:translateZ(22px);
    transition:transform .15s ease, filter .15s ease;
    filter:drop-shadow(0 10px 8px rgba(0,0,0,0.55));
  }
  .piece:hover{ transform:translateZ(34px) scale(1.06); }
  .piece.dragging{ opacity:0.35; }
  .piece.white-piece {
    color: #ffffff !important;
    -webkit-text-stroke: 0 !important;
    text-stroke: 0 !important;
    text-shadow: none !important;
    filter: 
      drop-shadow(0 0 1px #000000) 
      drop-shadow(0 0 3px #000000) 
      drop-shadow(0 2px 5px rgba(0,0,0,0.9));
  }

  .piece.black-piece {
    color: #000000 !important;
    -webkit-text-stroke: 0 !important;
    text-stroke: 0 !important;
    text-shadow: none !important;
    filter: 
      drop-shadow(0 0 1px #ffffff) 
      drop-shadow(0 0 4px #ffffff) 
      drop-shadow(0 0 10px rgba(255,255,255,0.95));
  }
  .piece::after{
    content:'';
    position:absolute;
    left:50%;bottom:-6px;
    width:60%;height:10px;
    background:radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%);
    transform:translateX(-50%);
    z-index:-1;
  }

  @keyframes popIn{
    from{ transform:translateZ(22px) scale(0.4); opacity:0; }
    to{ transform:translateZ(22px) scale(1); opacity:1; }
  }
  .piece.just-moved{ animation:popIn .22s ease-out; }

  .scrollbar-thin::-webkit-scrollbar{ width:6px; }
  .scrollbar-thin::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.18); border-radius:4px; }

  .btn{
    transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .btn:hover{ transform:translateY(-1px); }
  .btn:active{ transform:translateY(0px) scale(0.98); }
  .glow-ring:focus{ outline:none; box-shadow:0 0 0 3px rgba(255,255,255,0.3); }

  .modal-backdrop{
    background:rgba(0,0,0,0.72);
    backdrop-filter:blur(3px);
  }
  .cap-piece{ font-size:20px; text-shadow:0 0 6px rgba(255,255,255,0.4); }
.piece {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.2s ease, 
              filter 0.15s ease;
  will-change: transform, opacity;
  cursor: grab;
}

.piece:active, .piece.dragging {
  cursor: grabbing;
  transform: scale(1.18);
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5));
  z-index: 40;
}

/* Animasi petak tujuan saat disorot */
.square.selected {
  background-color: rgba(255, 255, 255, 0.18) !important;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.4);
}

/* Animasi petak bekas langkah terakhir */
.square.last-move {
  background-color: rgba(255, 215, 0, 0.15) !important;
}

/* Animasi membal (pop) saat bidak baru mendarat */
@keyframes piecePop {
  0% { transform: scale(0.85); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.piece.just-moved {
  animation: piecePop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Animasi memudar untuk bidak yang dimakan */
.piece.capturing {
  transform: scale(0);
  opacity: 0;
}

  #sidebar{ transition:transform .3s ease; }
  #sidebarBackdrop{
    position:fixed; inset:0;
    background:rgba(0,0,0,0.65);
    backdrop-filter:blur(2px);
    z-index:60;
    opacity:0;
    pointer-events:none;
    transition:opacity .3s ease;
  }
  #sidebarBackdrop.open{ opacity:1; pointer-events:auto; }

  @media (max-width:1023.98px){
    #sidebar{
      position:fixed;
      top:0; left:0;
      height:100dvh;
      width:min(88vw,380px);
      z-index:70;
      transform:translateX(-100%);
      overflow-y:auto;
      background:linear-gradient(180deg,#141419,#0b0b0f);
      border-right:1px solid var(--panel-line);
      padding:1.25rem 1.25rem 2.5rem;
      box-shadow:20px 0 60px -20px rgba(0,0,0,0.8);
    }
    #sidebar.open{ transform:translateX(0); }
  }
  @media (min-width:1024px){
    #sidebarBackdrop{ display:none; }
  }

  @media (max-width: 639.98px) {
  .piece {
    font-size: 7.5vw !important;
  }
}

.btn-fullscreen-fixed {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 50;
}
</style>
</head>
<body class="antialiased">

<div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">

  <header class="flex items-center justify-between mb-8 gap-3">
    <div class="flex items-center gap-3">
      <button id="btnMenuToggle" aria-label="Buka menu" class="lg:hidden btn hairline border rounded-lg p-2.5 bg-white/5 hover:bg-white/10 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div>
        <h1 class="font-display text-2xl sm:text-3xl tracking-tightish" style="text-shadow:0 0 24px rgba(255,255,255,0.25)">Main Catur</h1>
      </div>
    </div>
    <!-- TOMBOL FULLSCREEN BARU -->
  <button id="btnFullscreen" aria-label="Layar Penuh" class="btn hairline border rounded-full p-2.5 text-xs sm:text-sm bg-white/5 hover:bg-white/10 shrink-0">
    <svg id="iconExpand" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
    <svg id="iconCompress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    </svg>
  </button>
  </header>

  <div class="lg:grid lg:grid-cols-[1fr_3fr] gap-6 lg:items-start">

    <div id="sidebarBackdrop"></div>

    <aside id="sidebar">
      <div class="flex items-center justify-between mb-4 lg:hidden">
        <h2 class="font-display text-lg">Menu</h2>
        <button id="btnMenuClose" aria-label="Tutup menu" class="text-white/50 hover:text-white text-2xl leading-none px-2">&times;</button>
      </div>

      <div class="panel rounded-2xl p-5 mb-6">
        <h2 class="font-display text-lg mb-4">Pengaturan</h2>

        <div class="mb-4">
          <p class="text-xs uppercase tracking-wide text-white/40 mb-2">Mode Permainan</p>
          <div class="grid grid-cols-2 gap-2">
            <button data-mode="pvp" class="mode-btn btn hairline border rounded-lg py-2 text-sm bg-white/10">2 Pemain</button>
            <button data-mode="ai" class="mode-btn btn hairline border rounded-lg py-2 text-sm bg-white/0">vs Komputer</button>
          </div>
        </div>

        <div id="aiOptions" class="mb-4 hidden">
          <p class="text-xs uppercase tracking-wide text-white/40 mb-2">Tingkat Kesulitan</p>
          <select id="difficulty" class="w-full bg-black/40 hairline border rounded-lg px-3 py-2 text-sm glow-ring">
            <option value="easy">Pemula</option>
            <option value="medium" selected>Menengah</option>
            <option value="hard">Sulit</option>
            <option value="master">Grandmaster</option>
          </select>

          <p class="text-xs uppercase tracking-wide text-white/40 mb-2 mt-4">Main Sebagai</p>
          <div class="grid grid-cols-2 gap-2">
            <button data-color="w" class="color-btn btn hairline border rounded-lg py-2 text-sm bg-white/10">Putih</button>
            <button data-color="b" class="color-btn btn hairline border rounded-lg py-2 text-sm bg-white/0">Hitam</button>
          </div>
        </div>

        <div class="mb-4">
          <label class="text-xs uppercase tracking-wide text-white/40 mb-2 block">Nama Pemain</label>
          <input id="playerName" type="text" maxlength="40" placeholder="Nama kamu"
                 class="w-full bg-black/40 hairline border rounded-lg px-3 py-2 text-sm glow-ring" value="Pemain">
        </div>

        <button id="btnStart" class="btn w-full rounded-lg py-3 font-semibold bg-white text-black hover:bg-white/90 mb-2">Mulai Permainan Baru</button>

        

        <div class="mt-4 flex items-center justify-between text-xs text-white/50">
          <label class="flex items-center gap-2 cursor-pointer">
            <input id="soundToggle" type="checkbox" checked class="accent-white">
            Suara
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input id="tiltToggle" type="checkbox" class="accent-white">
            Mode 3D
          </label>
        </div>
      </div>

      <!-- NOTES: HISTORY & CAPTURES -->
      <div class="panel rounded-2xl p-5 flex flex-col" style="max-height:520px">
        <h2 class="font-display text-lg mb-3">Papan Catatan</h2>

        <div class="flex items-center gap-2 mb-5">
          <button id="btnLeaderboard" class="btn hairline border rounded-full px-4 py-2 text-xs sm:text-sm bg-white/5 hover:bg-white/10">Papan Peringkat</button>
          <button id="btnHowTo" class="btn hairline border rounded-full px-4 py-2 text-xs sm:text-sm bg-white/5 hover:bg-white/10">Cara Main</button>
        </div>

        <div class="mb-4">
          <p class="text-xs uppercase tracking-wide text-white/40 mb-1">Tertangkap — Putih</p>
          <div id="capturedByWhite" class="flex flex-wrap gap-1 min-h-[24px]"></div>
        </div>
        <div class="mb-4">
          <p class="text-xs uppercase tracking-wide text-white/40 mb-1">Tertangkap — Hitam</p>
          <div id="capturedByBlack" class="flex flex-wrap gap-1 min-h-[24px]"></div>
        </div>

        <p class="text-xs uppercase tracking-wide text-white/40 mb-1">Riwayat Langkah</p>
        <div id="moveList" class="flex-1 overflow-y-auto scrollbar-thin text-sm font-mono leading-7 pr-2"></div>

        <div class="flex items-center gap-6 mt-10 text-xs text-white/40">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-white/90 inline-block" style="box-shadow:0 0 8px rgba(255,255,255,0.8)"></span> Langkah legal</div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm border-2 border-white/80 inline-block"></span> Terpilih / Skak</div>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-5 mb-4">
        <span id="turnIndicator" class="text-sm px-4 py-1.5 rounded-full hairline border bg-white/5 font-medium">Giliran: Putih</span>
        <span id="statusIndicator" class="text-sm text-white/50"></span>
      </div>
    </aside>

    <div class="flex flex-col items-center">
      <div class="board-stage">
        <div id="boardTilt" class="board-tilt flat">
          <div id="board" class="board"></div>
        </div>

        <div class="flex gap-2 mt-10">
          <button id="btnUndo" class="btn flex-1 hairline border rounded-lg py-2 text-sm bg-white/5 hover:bg-white/10">Undo</button>
          <button id="btnFlip" class="btn flex-1 hairline border rounded-lg py-2 text-sm bg-white/5 hover:bg-white/10">Putar Papan</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="promoModal" class="fixed inset-0 modal-backdrop hidden items-center justify-center z-50">
  <div class="panel rounded-2xl p-6 w-72 text-center">
    <p class="font-display text-lg mb-4">Promosi Bidak</p>
    <div id="promoChoices" class="grid grid-cols-4 gap-3"></div>
  </div>
</div>

<div id="overModal" class="fixed inset-0 modal-backdrop hidden items-center justify-center z-50">
  <div class="panel rounded-2xl p-8 w-80 text-center">
    <p class="font-display text-2xl mb-2" style="text-shadow:0 0 20px rgba(255,255,255,0.4)" id="overTitle">Skak Mat</p>
    <p class="text-sm text-white/60 mb-6" id="overSubtitle">Putih menang</p>
    <div class="flex gap-2">
      <button id="overRematch" class="btn flex-1 rounded-lg py-2.5 font-semibold bg-white text-black hover:bg-white/90">Main Lagi</button>
      <button id="overClose" class="btn flex-1 rounded-lg py-2.5 hairline border bg-white/5 hover:bg-white/10">Tutup</button>
    </div>
  </div>
</div>

<div id="leaderModal" class="fixed inset-0 modal-backdrop hidden items-center justify-center z-50">
  <div class="panel rounded-2xl p-6 w-96 max-w-[90vw]">
    <div class="flex items-center justify-between mb-4">
      <p class="font-display text-lg">Papan Peringkat</p>
      <button id="leaderClose" class="text-white/50 hover:text-white text-xl leading-none">&times;</button>
    </div>
    <div id="leaderContent" class="text-sm text-white/70 max-h-80 overflow-y-auto scrollbar-thin"></div>
  </div>
</div>

<div id="howtoModal" class="fixed inset-0 modal-backdrop hidden items-center justify-center z-50">
  <div class="panel rounded-2xl p-6 w-96 max-w-[90vw]">
    <div class="flex items-center justify-between mb-4">
      <p class="font-display text-lg">Cara Bermain</p>
      <button id="howtoClose" class="text-white/50 hover:text-white text-xl leading-none">&times;</button>
    </div>
    <ul class="text-sm text-white/70 space-y-2 list-disc pl-4">
      <li>Pilih mode 2 Pemain (satu perangkat bergantian) atau vs Komputer.</li>
      <li>Klik bidak untuk melihat langkah legal, lalu klik kotak tujuan — atau seret langsung bidaknya.</li>
      <li>Aturan catur standar berlaku: skak, skak mat, rokade, en passant, promosi.</li>
      <li>Hasil pertandingan otomatis tersimpan ke papan peringkat jika database aktif, atau disimpan lokal di peramban.</li>
    </ul>
  </div>
</div>

<script>
const DB_AVAILABLE = <?php echo $dbAvailable ? 'true' : 'false'; ?>;
</script>
<script src="assets.js"></script>
</body>
</html>