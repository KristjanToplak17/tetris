const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20; // 10 * 20 = 200 width, 20 * 20 = 400 height

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

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

const scoreEl = document.getElementById("score-value");
const linesEl = document.getElementById("lines-value");
const levelEl = document.getElementById("level-value");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayRestartBtn = document.getElementById("overlay-restart-btn");

const startScreen = document.getElementById("start-screen");
const playerNameInput = document.getElementById("player-name-input");
const startGameBtnMain = document.getElementById("start-game-btn");
const leaderboardList = document.getElementById("leaderboard-list");

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

  overlayRestartBtn.style.display = showRestart ? "inline-flex" : "none";
}

setOverlay(true, "Paused", "Press Start to begin");

function clearBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

let board = clearBoard();

const COLORS = {
  0: "transparent",
  1: "#22c55e",
  2: "#3b82f6",
  3: "#eab308",
  4: "#ec4899",
  5: "#f97316",
  6: "#a855f7",
  7: "#06b6d4",
};

const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

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
      [0, 2, 2, 0],
      [0, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  T: {
    id: 3,
    shape: [
      [0, 3, 0, 0],
      [3, 3, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  S: {
    id: 4,
    shape: [
      [0, 4, 4, 0],
      [4, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  Z: {
    id: 5,
    shape: [
      [5, 5, 0, 0],
      [0, 5, 5, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  J: {
    id: 6,
    shape: [
      [6, 0, 0, 0],
      [6, 6, 6, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  L: {
    id: 7,
    shape: [
      [0, 0, 7, 0],
      [7, 7, 7, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
};

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
  800, 720, 630, 550, 470, 400, 330, 270, 220, 180,
  150, 130, 115, 105, 95, 85, 75, 70, 65, 60,
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
  updateStats();
  setOverlay(false);
}

function updateStats() {
  scoreEl.textContent = String(Math.round(displayScore));
  linesEl.textContent = String(lines);
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
  if (!name) return;
  const entries = loadLeaderboard();
  entries.push({
    name,
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
  leaderboardList.innerHTML = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = "No scores yet. Be the first!";
    leaderboardList.appendChild(li);
    return;
  }

  entries.forEach((entry, index) => {
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
    leaderboardList.appendChild(li);
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
  const clearedRows = [];
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }
    clearedRows.push(y);
    const row = board.splice(y, 1)[0];
    row.fill(0);
    board.unshift(row);
    cleared++;
    y++;
  }

  if (cleared > 0) {
    const pointsTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
    score += (pointsTable[cleared] || 0) * level;
    lines += cleared;

    const newLevel = 1 + Math.floor(lines / 10);
    if (newLevel !== level) {
      level = newLevel;
      dropInterval = getGravityMsForLevel(level);
      playSfx("level");
    }

    playSfx("clear");
    startClearFx(cleared, clearedRows);
    updateStats();
  }
}

let clearFxMs = 0;
let clearFxRows = [];
let shakeMs = 0;
let shakeStrength = 0;

function startClearFx(clearedCount, rows) {
  clearFxMs = 160;
  clearFxRows = rows;
  if (clearedCount >= 3) {
    shakeMs = 180;
    shakeStrength = clearedCount === 4 ? 4 : 2.5;
  }
}

function spawnPiece() {
  const nextType = nextQueue.shift();
  currentPiece = createPiece(nextType);
  currentPiece.x = 3;
  currentPiece.y = -2;
  nextQueue.push(nextFromBag());
  canHold = true;
  grounded = false;
  lockElapsed = 0;

  if (collides(board, currentPiece, 0, 0)) {
    gameOver = true;
    running = false;
    isPaused = true;
    addLeaderboardEntry(playerName, score, lines, level);
    setOverlay(true, "Game Over", `Final score: ${score}`, true);
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
  lockPiece();
}

function lockPiece() {
  mergePiece();
  clearLines();
  if (board[0].some((cell) => cell !== 0)) {
    gameOver = true;
    running = false;
    isPaused = true;
    addLeaderboardEntry(playerName, score, lines, level);
    setOverlay(true, "Game Over", `Final score: ${score}`, true);
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

function rotateCurrent() {
  if (!currentPiece) return;
  const rotated = rotateMatrix(currentPiece.shape);
  const originalShape = currentPiece.shape;
  currentPiece.shape = rotated;

  if (collides(board, currentPiece, 0, 0)) {
    currentPiece.shape = originalShape;
  } else {
    playSfx("rotate");
    if (!collides(board, currentPiece, 0, 1)) {
      grounded = false;
      lockElapsed = 0;
    }
  }
}

function drawCell(context, x, y, value, size) {
  if (!value) return;
  const color = COLORS[value] || "#ffffff";
  const px = x * size;
  const py = y * size;

  const gradKey = `${value}-${size}`;
  drawCell._gradCache ||= new Map();
  const cache = drawCell._gradCache;
  let fill = cache.get(gradKey);
  if (!fill) {
    const g = context.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(255,255,255,0.18)");
    fill = g;
    cache.set(gradKey, fill);
  }

  context.save();
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.fillStyle = fill;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.restore();

  context.strokeStyle = "rgba(15,23,42,0.9)";
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
}

function drawGhostCell(context, x, y, value, size) {
  if (!value) return;
  const color = COLORS[value] || "#ffffff";
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

  ctx.save();
  if (shakeMs > 0) {
    const t = performance.now();
    const dx = (Math.sin(t * 0.22) * shakeStrength) | 0;
    const dy = (Math.cos(t * 0.18) * shakeStrength) | 0;
    ctx.translate(dx, dy);
  }

  drawGridLines(ctx, COLS, ROWS, BLOCK_SIZE);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawCell(ctx, x, y, board[y][x], BLOCK_SIZE);
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

  if (clearFxMs > 0 && clearFxRows.length) {
    ctx.save();
    const alpha = Math.min(1, clearFxMs / 160) * 0.55;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    clearFxRows.forEach((row) => {
      ctx.fillRect(0, row * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
    });
    ctx.restore();
  }

  ctx.restore();
}

function drawMiniPiece(context, piece) {
  context.clearRect(0, 0, 96, 96);
  drawGridLines(context, 4, 4, 20);
  if (!piece) return;
  const { shape, id } = piece;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      drawCell(context, x, y, id, 20);
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
  const delta = time - lastTime;
  lastTime = time;

  if (displayScore !== score) {
    const diff = score - displayScore;
    const step = Math.max(1, Math.abs(diff) * 0.18);
    displayScore += Math.sign(diff) * step;
    if (Math.sign(score - displayScore) !== Math.sign(diff)) {
      displayScore = score;
    }
    scoreEl.textContent = String(Math.round(displayScore));
  }

  if (clearFxMs > 0) {
    clearFxMs = Math.max(0, clearFxMs - delta);
    if (clearFxMs === 0) clearFxRows = [];
  }
  if (shakeMs > 0) {
    shakeMs = Math.max(0, shakeMs - delta);
    if (shakeMs === 0) shakeStrength = 0;
  }

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
    currentPiece.x = 3;
    currentPiece.y = -2;
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

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);
overlayRestartBtn.addEventListener("click", restartGame);

playerNameInput.addEventListener("input", validatePlayerName);
startGameBtnMain.addEventListener("click", startFromStartScreen);

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === "p" || key === "P") {
    pauseGame();
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
      if (!running || isPaused || gameOver) break;
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

resetGame();
renderLeaderboard();
requestAnimationFrame(update);

