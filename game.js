const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24; // 10 * 24 = 240 width, 20 * 24 = 480 height
const MINI_CELL_SIZE = 20;
const MINI_GRID_SIZE = 4;
const MINI_CANVAS_SIZE = MINI_CELL_SIZE * MINI_GRID_SIZE;

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const next1Canvas = document.getElementById("next1-canvas");
const next2Canvas = document.getElementById("next2-canvas");
const next3Canvas = document.getElementById("next3-canvas");
const nextContexts = [
  next1Canvas.getContext("2d"),
  next2Canvas.getContext("2d"),
  next3Canvas.getContext("2d"),
];

const holdCanvas = document.getElementById("hold-canvas");
const holdCtx = holdCanvas.getContext("2d");
next1Canvas.width = MINI_CANVAS_SIZE;
next1Canvas.height = MINI_CANVAS_SIZE;
next2Canvas.width = MINI_CANVAS_SIZE;
next2Canvas.height = MINI_CANVAS_SIZE;
next3Canvas.width = MINI_CANVAS_SIZE;
next3Canvas.height = MINI_CANVAS_SIZE;
holdCanvas.width = MINI_CANVAS_SIZE;
holdCanvas.height = MINI_CANVAS_SIZE;

const scoreEl = document.getElementById("score-value");
const linesEl = document.getElementById("lines-value");
const levelEl = document.getElementById("level-value");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayRestartBtn = document.getElementById("overlay-restart-btn");

const startScreen = document.getElementById("start-screen");
const playerNameInput = document.getElementById("player-name-input");
const startGameBtnMain = document.getElementById("start-game-btn");
const leaderboardListStart = document.getElementById("leaderboard-list");
const leaderboardListGameOver = document.getElementById("leaderboard-list-gameover");

const audio = {
  move: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="),
  rotate: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="),
  drop: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="),
  clear: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="),
  level: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="),
};

function playSfx(key) {
  const s = audio[key];
  if (!s) return;
  try {
    s.currentTime = 0;
    s.play().catch(() => {});
  } catch {
    // ignore
  }
}

function setOverlay(visible, title, message, showRestart = false) {
  if (visible) {
    overlay.classList.remove("overlay--hidden");
    overlay.setAttribute("aria-hidden", "false");
  } else {
    overlay.classList.add("overlay--hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  if (title !== undefined) overlayTitle.textContent = title;
  if (message !== undefined) overlayMessage.textContent = message;

  overlayRestartBtn.style.display = showRestart ? "block" : "none";
}

// One main button: Start before a game, Pause while playing, Resume when paused.
function syncStartButton() {
  const label = !running || gameOver ? "Start" : isPaused ? "Resume" : "Pause";
  if (startBtn.textContent !== label) startBtn.textContent = label;
}

setOverlay(true, "Paused", "Press Start to begin");

function clearBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

let board = clearBoard();

const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
const TETROMINO_COLORS = Object.freeze({
  I: "#2DD4D7", // cyan
  J: "#2563EB", // blue
  L: "#F97316", // orange
  O: "#FACC15", // yellow
  S: "#22C55E", // green
  Z: "#EF4444", // red
  T: "#A855F7", // purple
});

// Each piece sits in its standard rotation box (I 4x4, O 2x2, others 3x3),
// so turning keeps it in place instead of drifting.
const PIECE_DEFS = {
  I: {
    id: 1,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    id: 2,
    shape: [
      [2, 2],
      [2, 2],
    ],
  },
  T: {
    id: 3,
    shape: [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0],
    ],
  },
  S: {
    id: 4,
    shape: [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    id: 5,
    shape: [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ],
  },
  J: {
    id: 6,
    shape: [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0],
    ],
  },
  L: {
    id: 7,
    shape: [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0],
    ],
  },
};

const PIECE_ID_TO_TYPE = Object.freeze(
  Object.fromEntries(Object.entries(PIECE_DEFS).map(([type, def]) => [def.id, type]))
);

function getColorForCellValue(value) {
  const type = PIECE_ID_TO_TYPE[value];
  return type ? TETROMINO_COLORS[type] : "#ffffff";
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function createPiece(type) {
  const def = PIECE_DEFS[type];
  return {
    type,
    id: def.id,
    shape: cloneMatrix(def.shape),
    x: 3,
    y: -2,
  };
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

let bag = [];
function nextFromBag() {
  if (bag.length === 0) {
    bag = shuffleInPlace(PIECE_TYPES.slice());
  }
  return bag.pop();
}

let currentPiece = null;

let score = 0;
let lines = 0;
let level = 1;
let displayScore = 0;

const GRAVITY_MS_BY_LEVEL = [
  0,
  600, 520, 440, 370, 310, 260, 220, 190, 160, 135,
  115, 100, 90, 80, 70, 60, 55, 50, 48, 45,
];

function getGravityMsForLevel(lvl) {
  const idx = Math.max(1, Math.min(lvl, GRAVITY_MS_BY_LEVEL.length - 1));
  return GRAVITY_MS_BY_LEVEL[idx];
}

let dropInterval = getGravityMsForLevel(level);
let lastTime = 0;
let dropAccumulator = 0;
let running = false;
let isPaused = true;
let gameOver = false;

let grounded = false;
let lockElapsed = 0;
const LOCK_DELAY_MS = 700;

let playerName = null;

let holdPiece = null;
let canHold = true;

let nextQueue = [nextFromBag(), nextFromBag(), nextFromBag(), nextFromBag(), nextFromBag()];

let leftHeld = false;
let rightHeld = false;
let moveDir = 0;
let dasTimer = 0;
let arrTimer = 0;
const DAS_MS = 160;
const ARR_MS = 40;

let softDropHeld = false;
let softDropTimer = 0;
const SOFT_DROP_INTERVAL_MS = 55;

const LEADERBOARD_KEY = "vibe-tetris-leaderboard-v1";

function resetGame() {
  board = clearBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = getGravityMsForLevel(level);
  currentPiece = null;
  holdPiece = null;
  canHold = true;
  bag = [];
  nextQueue = [nextFromBag(), nextFromBag(), nextFromBag(), nextFromBag(), nextFromBag()];
  running = false;
  isPaused = false;
  gameOver = false;
  grounded = false;
  lockElapsed = 0;
  displayScore = 0;
  clearFx = null;
  lockFx = null;
  beamFx = null;
  sparks = [];
  updateStats();
  setOverlay(false);
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}

function updateStats() {
  scoreEl.textContent = formatNumber(displayScore);
  linesEl.textContent = formatNumber(lines);
  levelEl.textContent = String(level);
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function addLeaderboardEntry(name, scoreValue, linesValue, levelValue) {
  const safeName = (name && name.trim()) || "Player";
  const entries = loadLeaderboard();
  entries.push({
    name: safeName,
    score: scoreValue,
    lines: linesValue,
    level: levelValue,
    at: new Date().toISOString(),
  });
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, 15);
  saveLeaderboard(trimmed);
  renderLeaderboard();
}

function renderLeaderboard() {
  const entries = loadLeaderboard();
  const targets = [leaderboardListStart, leaderboardListGameOver].filter(Boolean);
  targets.forEach((list) => {
    list.innerHTML = "";
  });

  if (!entries.length) {
    targets.forEach((list) => {
      const li = document.createElement("li");
      li.textContent = "No scores yet. Be the first!";
      list.appendChild(li);
    });
    return;
  }

  const topFive = entries.slice(0, 5);

  topFive.forEach((entry, index) => {
    const li = document.createElement("li");
    const rank = document.createElement("span");
    const name = document.createElement("span");
    const scoreValue = document.createElement("span");

    rank.className = "leaderboard-rank";
    name.className = "leaderboard-name";
    scoreValue.className = "leaderboard-score";

    rank.textContent = String(index + 1).padStart(2, "0");
    name.textContent = entry.name;
    scoreValue.textContent = entry.score.toLocaleString();

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(scoreValue);

    targets.forEach((list) => {
      list.appendChild(li.cloneNode(true));
    });
  });
}

function collides(boardRef, piece, offsetX, offsetY) {
  const { shape } = piece;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      if (newY >= 0 && boardRef[newY][newX] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  const { shape, id } = currentPiece;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const boardX = currentPiece.x + x;
      const boardY = currentPiece.y + y;
      if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
        board[boardY][boardX] = id;
      }
    }
  }
}

function clearLines() {
  let cleared = 0;
  const fullRows = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((cell) => cell !== 0)) {
      fullRows.push({ y, cells: board[y].slice() });
    }
  }
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }
    const row = board.splice(y, 1)[0];
    row.fill(0);
    board.unshift(row);
    cleared++;
    y++;
  }

  if (cleared > 0) {
    const pointsTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
    const points = (pointsTable[cleared] || 0) * level;
    score += points;
    lines += cleared;

    const newLevel = 1 + Math.floor(lines / 10);
    if (newLevel !== level) {
      level = newLevel;
      dropInterval = getGravityMsForLevel(level);
      playSfx("level");
    }

    playSfx("clear");
    startClearFx(fullRows, points);
    updateStats();
  }
  return fullRows.map((row) => row.y);
}

/* ---- Feedback effects (drawing only; game logic is unchanged) ---- */
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const FX = Object.freeze({
  beamAlpha: 0.14,
  beamMs: 200,
  beamSpecks: 3,
  lockAlpha: 0.25,
  lockMs: 80,
  landingSparks: 3,
  clearGlowAlpha: 0.8,
  clearGlowMs: 60,
  clearSweepMs: 240,
  settleMs: 170,
  calloutMs: 850,
  dipPx: 2,
  dipMs: 120,
});
const CALLOUT_LABELS = { 2: "DOUBLE", 3: "TRIPLE", 4: "TETRIS" };

let clearFx = null;
let lockFx = null;
let beamFx = null;
let sparks = [];

const easeOut = (t) => 1 - Math.pow(1 - t, 4);

function startClearFx(fullRows, points) {
  const clearedYs = fullRows.map((row) => row.y);
  const remaining = [];
  for (let y = 0; y < ROWS; y++) {
    if (!clearedYs.includes(y)) remaining.push(y);
  }
  const shift = Array(ROWS).fill(0);
  for (let y = fullRows.length; y < ROWS; y++) {
    shift[y] = y - remaining[y - fullRows.length];
  }
  clearFx = {
    start: performance.now(),
    rows: fullRows,
    shift,
    count: fullRows.length,
    points,
    sparked: new Set(),
  };
}

// A new piece locked mid-animation: the board has changed, so stop moving rows
// and dissolving the old ones, but let the call-out finish.
function finishClearFx() {
  if (clearFx) clearFx.settled = true;
}

function addSpark(x, y, color, up) {
  if (reducedMotionQuery.matches) return;
  const angle = up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2;
  const speed = 18 + Math.random() * 27;
  sparks.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (up ? 12 : 20),
    life: 0,
    max: 200 + Math.random() * 100,
    color: Math.random() < (up ? 0.4 : 0.7) ? "#ffffff" : color,
    r: 0.8 + Math.random() * 0.9,
  });
}

function getPieceCells(piece) {
  const cells = [];
  piece.shape.forEach((row, y) =>
    row.forEach((filled, x) => {
      if (filled) cells.push({ x: piece.x + x, y: piece.y + y, id: piece.id });
    })
  );
  return cells;
}

function startLockFx(cells, clearedYs) {
  const visible = [];
  cells.forEach((cell) => {
    if (cell.y < 0 || clearedYs.includes(cell.y)) return;
    const below = clearedYs.filter((y) => y > cell.y).length;
    visible.push({ x: cell.x, y: cell.y + below, id: cell.id });
  });
  lockFx = { start: performance.now(), cells: visible };

  const bottoms = new Map();
  visible.forEach((cell) => {
    if (!bottoms.has(cell.x) || bottoms.get(cell.x).y < cell.y) bottoms.set(cell.x, cell);
  });
  const edge = [...bottoms.values()];
  for (let i = 0; i < FX.landingSparks && edge.length; i++) {
    const cell = edge[Math.floor(Math.random() * edge.length)];
    addSpark(
      (cell.x + 0.2 + Math.random() * 0.6) * BLOCK_SIZE,
      (cell.y + 1) * BLOCK_SIZE - 2,
      getColorForCellValue(cell.id),
      true
    );
  }
}

// Centre the piece with its top row just above the board, then step it down
// one row if there is room, so it is visible straight away.
function placeAtSpawn(piece) {
  const width = piece.shape[0].length;
  const topRow = piece.shape.findIndex((row) => row.some(Boolean));
  piece.x = Math.floor((COLS - width) / 2);
  piece.y = -1 - topRow;
  if (!collides(board, piece, 0, 1)) piece.y++;
}

function spawnPiece() {
  const nextType = nextQueue.shift();
  currentPiece = createPiece(nextType);
  placeAtSpawn(currentPiece);
  nextQueue.push(nextFromBag());
  canHold = true;
  grounded = false;
  lockElapsed = 0;

  if (collides(board, currentPiece, 0, 0)) {
    gameOver = true;
    running = false;
    isPaused = true;
    addLeaderboardEntry(playerName, score, lines, level);
    setOverlay(true, "Game Over", `Final score: ${formatNumber(score)}`, true);
  }
}

function hardDrop() {
  if (!currentPiece) return;
  let dropDistance = 0;
  while (!collides(board, currentPiece, 0, 1)) {
    currentPiece.y++;
    dropDistance++;
  }
  if (dropDistance > 0) {
    score += dropDistance * 2 * level;
    updateStats();
  }
  playSfx("drop");
  if (dropDistance > 0 && !reducedMotionQuery.matches) {
    beamFx = { start: performance.now(), cells: getPieceCells(currentPiece) };
    addBeamSpecks(beamFx.cells);
  }
  lockPiece();
}

function lockPiece() {
  finishClearFx();
  const lockedCells = getPieceCells(currentPiece);
  mergePiece();
  const clearedYs = clearLines();
  startLockFx(lockedCells, clearedYs);
  if (board[0].some((cell) => cell !== 0)) {
    gameOver = true;
    running = false;
    isPaused = true;
    addLeaderboardEntry(playerName, score, lines, level);
    setOverlay(true, "Game Over", `Final score: ${formatNumber(score)}`, true);
    return;
  }
  spawnPiece();
}

function softDrop() {
  tryMoveDown(true);
}

function tryMoveDown(fromSoftDrop) {
  if (!currentPiece) return;
  if (!collides(board, currentPiece, 0, 1)) {
    currentPiece.y++;
    grounded = false;
    lockElapsed = 0;
    if (fromSoftDrop) {
      score += 1 * level;
      updateStats();
      playSfx("drop");
    }
  } else if (!grounded) {
    grounded = true;
    lockElapsed = 0;
  }
}

function movePiece(dir) {
  if (!currentPiece) return;
  const offset = dir === "left" ? -1 : 1;
  if (!collides(board, currentPiece, offset, 0)) {
    currentPiece.x += offset;
    playSfx("move");
    if (!collides(board, currentPiece, 0, 1)) {
      grounded = false;
      lockElapsed = 0;
    }
  }
}

function tryApplyRotationWithKicks(piece, rotatedShape) {
  const originalShape = piece.shape;
  const originalX = piece.x;
  const originalY = piece.y;

  piece.shape = rotatedShape;

  const kicks = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
  ];

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    if (!collides(board, piece, dx, dy)) {
      piece.x += dx;
      piece.y += dy;
      return true;
    }
  }

  piece.shape = originalShape;
  piece.x = originalX;
  piece.y = originalY;
  return false;
}

function rotateCurrent() {
  if (!currentPiece) return;
  const rotated = rotateMatrix(currentPiece.shape);
  if (!tryApplyRotationWithKicks(currentPiece, rotated)) {
    return;
  }

  playSfx("rotate");
  if (!collides(board, currentPiece, 0, 1)) {
    grounded = false;
    lockElapsed = 0;
  }
}

const shineCache = new WeakMap();

function getShine(context, size) {
  let bySize = shineCache.get(context);
  if (!bySize) {
    bySize = new Map();
    shineCache.set(context, bySize);
  }
  const key = Math.round(size * 10);
  let shine = bySize.get(key);
  if (!shine) {
    shine = context.createLinearGradient(0, 0, 0, size);
    shine.addColorStop(0, "rgba(255,255,255,0.34)");
    shine.addColorStop(0.46, "rgba(255,255,255,0.12)");
    shine.addColorStop(0.52, "rgba(255,255,255,0)");
    shine.addColorStop(1, "rgba(0,0,0,0.12)");
    bySize.set(key, shine);
  }
  return shine;
}

// Bevelled block with a soft gloss and a faint glow. `scale` shrinks it in place.
function drawCell(context, x, y, value, size, scale = 1) {
  if (!value) return;
  const color = getColorForCellValue(value);
  const inner = (size - 2) * scale;
  const px = x * size + (size - inner) / 2;
  const py = y * size + (size - inner) / 2;
  const edge = Math.max(1.5, inner * 0.11);

  context.save();
  context.translate(px, py);
  context.shadowColor = `${color}66`;
  context.shadowBlur = size * 0.22;
  context.fillStyle = color;
  context.fillRect(0, 0, inner, inner);
  context.shadowBlur = 0;
  context.fillStyle = getShine(context, inner);
  context.fillRect(0, 0, inner, inner);
  context.fillStyle = "rgba(255,255,255,0.4)";
  context.fillRect(0, 0, inner, edge);
  context.fillRect(0, 0, edge, inner);
  context.fillStyle = "rgba(0,0,0,0.28)";
  context.fillRect(0, inner - edge, inner, edge);
  context.fillRect(inner - edge, 0, edge, inner);
  context.restore();
}

function drawWhite(context, x, y, size, alpha, scale = 1) {
  if (alpha <= 0) return;
  const inner = (size - 2) * scale;
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = "#ffffff";
  context.fillRect(x * size + (size - inner) / 2, y * size + (size - inner) / 2, inner, inner);
  context.restore();
}

function drawGhostCell(context, x, y, value, size) {
  if (!value) return;
  const color = getColorForCellValue(value);
  const px = x * size;
  const py = y * size;
  context.save();
  context.globalAlpha = 0.7;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.setLineDash([4, 3]);
  context.strokeRect(px + 2, py + 2, size - 4, size - 4);
  context.restore();
}

function drawGridLines(context, cols, rows, size) {
  context.strokeStyle = "rgba(148,163,184,0.14)";
  context.lineWidth = 0.5;
  context.beginPath();
  for (let x = 0; x <= cols; x++) {
    const px = x * size;
    context.moveTo(px + 0.5, 0.5);
    context.lineTo(px + 0.5, rows * size + 0.5);
  }
  for (let y = 0; y <= rows; y++) {
    const py = y * size;
    context.moveTo(0.5, py + 0.5);
    context.lineTo(cols * size + 0.5, py + 0.5);
  }
  context.stroke();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const now = performance.now();
  const motion = !reducedMotionQuery.matches;
  const clearElapsed = clearFx ? now - clearFx.start : 0;
  if (clearFx && clearElapsed > FX.clearSweepMs + Math.max(FX.settleMs, FX.calloutMs, FX.dipMs)) {
    clearFx = null;
  }

  ctx.save();
  if (clearFx && motion && clearFx.count >= 3) {
    const dipT = (clearElapsed - FX.clearSweepMs) / FX.dipMs;
    if (dipT > 0 && dipT < 1) ctx.translate(0, Math.sin(dipT * Math.PI) * FX.dipPx);
  }

  drawGridLines(ctx, COLS, ROWS, BLOCK_SIZE);

  // While a clear plays, the rows above start where they were and glide down.
  let settle = 1;
  if (clearFx && motion && !clearFx.settled) {
    settle = clearElapsed < FX.clearSweepMs
      ? 0
      : easeOut(Math.min(1, (clearElapsed - FX.clearSweepMs) / FX.settleMs));
  }
  for (let y = 0; y < ROWS; y++) {
    const drawY = clearFx && !clearFx.settled ? y - clearFx.shift[y] * (1 - settle) : y;
    for (let x = 0; x < COLS; x++) {
      drawCell(ctx, x, drawY, board[y][x], BLOCK_SIZE);
    }
  }

  if (clearFx && !clearFx.settled && clearElapsed < FX.clearSweepMs) {
    drawClearSweep(clearElapsed / FX.clearSweepMs, clearElapsed, motion);
  }

  if (beamFx) {
    const t = (now - beamFx.start) / FX.beamMs;
    if (t >= 1) {
      beamFx = null;
    } else {
      drawBeam(beamFx, FX.beamAlpha * (1 - easeOut(t)));
    }
  }

  if (lockFx) {
    const t = (now - lockFx.start) / FX.lockMs;
    if (t >= 1) {
      lockFx = null;
    } else {
      const alpha = FX.lockAlpha * (1 - easeOut(t));
      lockFx.cells.forEach((cell) => drawWhite(ctx, cell.x, cell.y, BLOCK_SIZE, alpha));
    }
  }

  if (currentPiece) {
    const ghostPiece = {
      id: currentPiece.id,
      shape: currentPiece.shape,
      x: currentPiece.x,
      y: currentPiece.y,
    };
    while (!collides(board, ghostPiece, 0, 1)) {
      ghostPiece.y++;
    }
    const ghostY = ghostPiece.y;

    ctx.save();
    const { shape: gShape, x: gx, id: gid } = ghostPiece;
    for (let y = 0; y < gShape.length; y++) {
      for (let x = 0; x < gShape[y].length; x++) {
        if (!gShape[y][x]) continue;
        const boardX = gx + x;
        const boardY = ghostY + y;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          drawGhostCell(ctx, boardX, boardY, gid, BLOCK_SIZE);
        }
      }
    }
    ctx.restore();
  }

  if (currentPiece) {
    const { shape, x: px, y: py, id } = currentPiece;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const boardX = px + x;
        const boardY = py + y;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          if (grounded && collides(board, currentPiece, 0, 1)) {
            const t = performance.now();
            const pulse = 0.55 + 0.35 * Math.sin(t / 70);
            ctx.save();
            ctx.globalAlpha = pulse;
            drawCell(ctx, boardX, boardY, id, BLOCK_SIZE);
            ctx.restore();
          } else {
            drawCell(ctx, boardX, boardY, id, BLOCK_SIZE);
          }
        }
      }
    }
  }

  drawSparks();

  if (clearFx && clearFx.count >= 2 && clearElapsed < FX.calloutMs) {
    drawCallout(clearElapsed / FX.calloutMs, motion);
  }

  ctx.restore();
}

// Full rows glow, then dissolve from the middle outwards, each block fading and shrinking a touch.
function drawClearSweep(progress, elapsed, motion) {
  const glow = Math.min(1, elapsed / FX.clearGlowMs);
  clearFx.rows.forEach((row) => {
    row.cells.forEach((value, x) => {
      const order = Math.abs(x - (COLS - 1) / 2) / (COLS / 2);
      const start = 0.15 + order * 0.6;
      const end = start + 0.3;
      const key = row.y * COLS + x;
      if (progress >= end) {
        if (!clearFx.sparked.has(key)) {
          clearFx.sparked.add(key);
          for (let i = 0; i < clearFx.count; i++) {
            addSpark((x + 0.5) * BLOCK_SIZE, (row.y + 0.5) * BLOCK_SIZE, getColorForCellValue(value), false);
          }
        }
        return;
      }
      const fade = progress > start ? easeOut((progress - start) / (end - start)) : 0;
      const scale = motion ? 1 - 0.25 * fade : 1;
      ctx.save();
      ctx.globalAlpha = 1 - fade;
      drawCell(ctx, x, row.y, value, BLOCK_SIZE, scale);
      ctx.restore();
      drawWhite(ctx, x, row.y, BLOCK_SIZE, FX.clearGlowAlpha * glow * (1 - fade), scale);
    });
  });
}

// Hard drop: a soft light column rises from the landed piece to the top of the board.
function drawBeam(beam, alpha) {
  const tops = new Map();
  beam.cells.forEach((cell) => {
    if (!tops.has(cell.x) || tops.get(cell.x) > cell.y) tops.set(cell.x, cell.y);
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  tops.forEach((topY, x) => {
    const y1 = topY * BLOCK_SIZE;
    if (y1 <= 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, y1);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(x * BLOCK_SIZE, 0, BLOCK_SIZE, y1);
  });
  ctx.restore();
}

function addBeamSpecks(cells) {
  if (reducedMotionQuery.matches) return;
  for (let i = 0; i < FX.beamSpecks; i++) {
    const cell = cells[Math.floor(Math.random() * cells.length)];
    sparks.push({
      x: (cell.x + Math.random()) * BLOCK_SIZE,
      y: cell.y * BLOCK_SIZE - Math.random() * BLOCK_SIZE * 4,
      vx: 0,
      vy: -(15 + Math.random() * 20),
      gravity: 0,
      life: 0,
      max: FX.beamMs,
      color: "#ffffff",
      r: 0.8 + Math.random() * 0.5,
    });
  }
}

function drawSparks() {
  if (!sparks.length) return;
  ctx.save();
  sparks.forEach((spark) => {
    ctx.globalAlpha = (1 - spark.life / spark.max) * 0.9;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function updateSparks(delta) {
  if (!sparks.length) return;
  const dt = Math.min(delta, 50) / 1000;
  sparks.forEach((spark) => {
    spark.life += dt * 1000;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy += (spark.gravity ?? 220) * dt;
  });
  sparks = sparks.filter((spark) => spark.life < spark.max);
}

// "Double", "Triple", "Tetris" fades in just above the middle of the board, then fades out.
function drawCallout(t, motion) {
  const appear = easeOut(Math.min(1, t / 0.2));
  const alpha = t < 0.2 ? appear : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  const scale = motion ? 0.92 + 0.08 * appear : 1;
  const rise = motion ? t * 6 : 0;
  ctx.save();
  ctx.translate((COLS * BLOCK_SIZE) / 2, 8 * BLOCK_SIZE - rise);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = "rgba(13,11,30,0.7)";
  ctx.fillText(CALLOUT_LABELS[clearFx.count], 0, 2);
  ctx.fillStyle = "#ffd84d";
  ctx.fillText(CALLOUT_LABELS[clearFx.count], 0, 0);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = "rgba(255,122,198,0.9)";
  ctx.fillText(`+${formatNumber(clearFx.points)}`, 0, 18);
  ctx.restore();
}

function drawMiniPiece(context, piece) {
  context.clearRect(0, 0, MINI_CANVAS_SIZE, MINI_CANVAS_SIZE);
  if (!piece) return;
  const { shape, id } = piece;
  let minX = shape[0].length;
  let minY = shape.length;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return;

  const pieceWidthPx = (maxX - minX + 1) * MINI_CELL_SIZE;
  const pieceHeightPx = (maxY - minY + 1) * MINI_CELL_SIZE;
  const offsetXCells = (MINI_CANVAS_SIZE - pieceWidthPx) / (2 * MINI_CELL_SIZE) - minX;
  const offsetYCells = (MINI_CANVAS_SIZE - pieceHeightPx) / (2 * MINI_CELL_SIZE) - minY;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      drawCell(context, x + offsetXCells, y + offsetYCells, id, MINI_CELL_SIZE);
    }
  }
}

function drawNextPieces() {
  drawNextPieces._last ||= [];
  const last = drawNextPieces._last;
  const now = nextQueue.slice(0, 3);
  let changed = false;
  for (let i = 0; i < 3; i++) {
    if (last[i] !== now[i]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  for (let i = 0; i < 3; i++) last[i] = now[i];

  now.forEach((type, index) => {
    const ctxMini = nextContexts[index];
    drawMiniPiece(ctxMini, createPiece(type));
  });
}

function drawHoldPiece() {
  drawHoldPiece._last = drawHoldPiece._last ?? null;
  if (drawHoldPiece._last === holdPiece) return;
  drawHoldPiece._last = holdPiece;
  drawMiniPiece(holdCtx, holdPiece ? createPiece(holdPiece) : null);
}

function update(time = 0) {
  // Cap the step so coming back to a hidden tab can't jump or instantly lock a piece.
  const delta = Math.min(time - lastTime, 50);
  lastTime = time;

  if (displayScore !== score) {
    const diff = score - displayScore;
    const step = Math.max(1, Math.abs(diff) * 0.18);
    displayScore += Math.sign(diff) * step;
    if (Math.sign(score - displayScore) !== Math.sign(diff)) {
      displayScore = score;
    }
    scoreEl.textContent = formatNumber(displayScore);
  }

  updateSparks(delta);

  if (running && !isPaused && !gameOver) {
    dropAccumulator += delta;
    if (dropAccumulator > dropInterval) {
      tryMoveDown(false);
      dropAccumulator = 0;
    }

    if (softDropHeld) {
      softDropTimer += delta;
      while (softDropTimer > SOFT_DROP_INTERVAL_MS) {
        softDrop();
        softDropTimer -= SOFT_DROP_INTERVAL_MS;
      }
    } else {
      softDropTimer = 0;
    }

    if (moveDir !== 0) {
      dasTimer += delta;
      if (dasTimer > DAS_MS) {
        arrTimer += delta;
        while (arrTimer > ARR_MS) {
          movePiece(moveDir === -1 ? "left" : "right");
          arrTimer -= ARR_MS;
        }
      }
    } else {
      dasTimer = 0;
      arrTimer = 0;
    }

    if (grounded) {
      if (!collides(board, currentPiece, 0, 1)) {
        grounded = false;
        lockElapsed = 0;
      } else {
        lockElapsed += delta;
        if (lockElapsed >= LOCK_DELAY_MS) {
          lockPiece();
          grounded = false;
          lockElapsed = 0;
        }
      }
    }
  }

  syncStartButton();
  drawBoard();
  drawNextPieces();
  drawHoldPiece();

  requestAnimationFrame(update);
}

function startGame() {
  if (!playerName) return;
  if (!running || gameOver) {
    resetGame();
    running = true;
    isPaused = false;
    gameOver = false;
    spawnPiece();
    setOverlay(false);
  } else if (isPaused) {
    isPaused = false;
    setOverlay(false);
  }
}

function pauseGame() {
  if (!running || gameOver) return;
  isPaused = !isPaused;
  if (isPaused) {
    setOverlay(true, "Paused", "Press Start or P to resume");
  } else {
    setOverlay(false);
  }
}

function restartGame() {
  resetGame();
  running = true;
  isPaused = false;
  gameOver = false;
  spawnPiece();
  setOverlay(false);
}

function handleHold() {
  if (!currentPiece || !canHold) return;
  if (!holdPiece) {
    holdPiece = currentPiece.type;
    spawnPiece();
  } else {
    const tempType = holdPiece;
    holdPiece = currentPiece.type;
    const swapped = createPiece(tempType);
    currentPiece.type = swapped.type;
    currentPiece.id = swapped.id;
    currentPiece.shape = swapped.shape;
    placeAtSpawn(currentPiece);
  }
  grounded = false;
  lockElapsed = 0;
  canHold = false;
}

function validatePlayerName() {
  const raw = (playerNameInput.value || "").trim();
  startGameBtnMain.disabled = raw.length === 0;
}

function startFromStartScreen() {
  const raw = (playerNameInput.value || "").trim();
  if (!raw) return;
  playerName = raw.slice(0, 16);
  startScreen.classList.add("start-screen--hidden");
  restartGame();
}

startBtn.addEventListener("click", () => {
  if (running && !gameOver) pauseGame();
  else startGame();
});
restartBtn.addEventListener("click", restartGame);
overlayRestartBtn.addEventListener("click", restartGame);

playerNameInput.addEventListener("input", validatePlayerName);
startGameBtnMain.addEventListener("click", startFromStartScreen);

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (event.target.closest("input, textarea")) return;

  if (key === "p" || key === "P") {
    if (!event.repeat) pauseGame();
    return;
  }

  switch (key) {
    case "ArrowLeft":
      if (!leftHeld) {
        leftHeld = true;
        moveDir = -1;
        if (!isPaused && running && !gameOver) movePiece("left");
        dasTimer = 0;
        arrTimer = 0;
      }
      break;
    case "ArrowRight":
      if (!rightHeld) {
        rightHeld = true;
        moveDir = 1;
        if (!isPaused && running && !gameOver) movePiece("right");
        dasTimer = 0;
        arrTimer = 0;
      }
      break;
    case "ArrowDown":
    case "PageDown":
      softDropHeld = true;
      break;
    case "ArrowUp":
      if (event.repeat || !running || isPaused || gameOver) break;
      rotateCurrent();
      break;
    case " ":
      event.preventDefault();
      if (!running || isPaused || gameOver) break;
      hardDrop();
      break;
    case "c":
    case "C":
      if (!running || isPaused || gameOver) break;
      handleHold();
      break;
    default:
      break;
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key;
  switch (key) {
    case "ArrowLeft":
      leftHeld = false;
      moveDir = rightHeld ? 1 : 0;
      dasTimer = 0;
      arrTimer = 0;
      break;
    case "ArrowRight":
      rightHeld = false;
      moveDir = leftHeld ? -1 : 0;
      dasTimer = 0;
      arrTimer = 0;
      break;
    case "ArrowDown":
    case "PageDown":
      softDropHeld = false;
      softDropTimer = 0;
      break;
    default:
      break;
  }
});

// Leaving the window: forget held keys (their key-up never arrives) and pause.
function releaseHeldKeys() {
  leftHeld = false;
  rightHeld = false;
  moveDir = 0;
  dasTimer = 0;
  arrTimer = 0;
  softDropHeld = false;
  softDropTimer = 0;
}

function pauseOnLeave() {
  releaseHeldKeys();
  if (running && !isPaused && !gameOver) pauseGame();
}

window.addEventListener("blur", pauseOnLeave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseOnLeave();
});

resetGame();
renderLeaderboard();
requestAnimationFrame(update);

