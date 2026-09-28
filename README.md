# Caturan — Obsidian & Ivory

A 3D web-based chess application built with PHP, jQuery, and Tailwind CSS. It features a 2-Player mode (PvP) and a vs. Computer mode using a minimax alpha-beta AI running inside a Web Worker to ensure smooth performance without UI lag.

---

## 📁 File Structure

```text
├── index.php    # Main page (UI layout + HTML markup)
├── assets.js    # Game logic, 3D board rendering, AI, audio synthesis, and API calls
├── config.php   # Database connection configuration (optional)
├── api.php      # AJAX endpoint for saving game results & leaderboard (optional)
└── schema.sql   # MySQL database table structure (optional)
```

---

## 🚀 How to Run

### 1. Without Database (Simplest Setup)
The game (both PvP and vs Computer) runs 100% locally in the browser.

1. Run the built-in PHP development server:
   ```bash
   php -S localhost:8000
   ```
2. Open `http://localhost:8000` in your browser.

> **Note:** Match results will automatically save locally in the browser (`localStorage`) and display on the leaderboard.

### 2. With Database (Permanent Cross-Device Leaderboards)
1. **Create the database:**
   ```sql
   CREATE DATABASE chess_pro CHARACTER SET utf8mb4;
   ```
2. **Import the schema:**
   ```bash
   mysql -u root -p chess_pro < schema.sql
   ```
3. Update your database credentials inside `config.php`.
4. Run the project as usual on a PHP web server (Apache, Nginx, or `php -S`).

*The application automatically detects if the database is reachable — if not, all core features remain fully functional via local storage fallback.*

---

## ✨ Features

- **3D Chess Board:** Rendered using CSS perspective and `translateZ` with glow effects and elegant black & white themes (*Obsidian & Ivory*).
- **Flexible Controls:** Supports both click-to-select and drag-and-drop interactions.
- **Visual Cues:** Highlights legal moves, last moved squares, and active check states with visual glows.
- **Game Modes:** 
  - **2 Players:** Local pass-and-play on a single device.
  - **vs Computer:** 4 AI difficulty levels (Beginner, Intermediate, Hard, Grandmaster) powered by iterative deepening and time budget algorithms.
- **Web Worker AI:** The AI runs in a separate thread so the main UI never freezes during complex calculations.
- **Rule Enforcement:** Full chess rule support including pawn promotion, castling, en passant, checkmate, and draw detection powered by `chess.js`.
- **Game Tracking:** Move history in Standard Algebraic Notation (SAN) and captured pieces tracker by color.
- **Synthesized Audio:** Built-in sound effects using the Web Audio API (no external audio files required).
- **Hybrid Leaderboard:** Works with a MySQL backend or falls back to `localStorage`.
- **2D/3D Toggle:** Switch between 3D perspective view and a flat 2D layout at any time.

---

## 🎨 Quick Customization

- **Board & Piece Styling:** Modify CSS variables in `:root` alongside `.square.light/.dark` and `.piece.white-piece/.black-piece` inside `index.php`.
- **AI Search Depth & Thinking Time:** Adjust the `pickMove()` function inside `AI_WORKER_SRC` located in `assets.js`.
- **AI Playing Style:** Customize the Piece-Square Tables inside the `PST` object within `AI_WORKER_SRC`.