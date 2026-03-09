# Vibe Tetris

A personalized Tetris-style game that runs in your browser.

## Running locally

Because this is a static web app (just HTML/CSS/JS), you only need a simple HTTP server.

On Windows you can use Python if you have it installed:

```bash
cd path/to/projectOne
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

in your browser and play.

If you don't want to use Python, any static file server works (Node, `live-server`, VS Code's Live Server extension, etc.).

## Controls

- **← / →**: Move piece left/right
- **↑**: Rotate piece
- **↓**: Soft drop
- **Space**: Hard drop
- **P**: Pause / resume

## Personalization

- Neon-arcade UI with a start screen, player name entry, and persistent local leaderboard.
- Subtle sound effects for movement, rotation, drops, line clears, and level ups.
- Standard-ish mechanics: hold (C), ghost piece, next 3, DAS/ARR movement, lock delay, hard drop.

You can tweak the colors, speeds, scoring, and sounds directly in `styles.css` and `game.js`.

