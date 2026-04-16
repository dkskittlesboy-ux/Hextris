const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const levelElement = document.getElementById('levelValue');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMessage = document.getElementById('authMessage');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const userStatus = document.getElementById('userStatus');
const signInTab = document.getElementById('signInTab');
const signUpTab = document.getElementById('signUpTab');
const signOutBtn = document.getElementById('signOutBtn');
let authMode = 'sign-in';
let isAuthenticated = false;
let authInitialized = false;

const firebaseConfig = {
  apiKey: "AIzaSyAko7Mh9ptui7D4el6VgLcBTq64beitYoc",
  authDomain: "app-project-770dd.firebaseapp.com",
  projectId: "app-project-770dd",
  storageBucket: "app-project-770dd.firebasestorage.app",
  messagingSenderId: "613043884831",
  appId: "1:613043884831:web:5bf96c814aaa74471a562a",
  measurementId: "G-Z3X2Y5Y159"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(error => {
  console.warn('Firebase persistence error:', error);
});
auth.signOut().catch(() => {});
const googleProvider = new firebase.auth.GoogleAuthProvider();

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#ff9a9a' : '#9db1c8';
}

function updateUserStatus(user) {
  userStatus.textContent = user ? `Signed in as ${user.email}` : 'Not signed in';
  signOutBtn.classList.toggle('hidden', !user);
}

function setAuthMode(mode) {
  authMode = mode;
  signInTab.classList.toggle('active', mode === 'sign-in');
  signUpTab.classList.toggle('active', mode === 'sign-up');
  authForm.querySelector('.primary-btn').textContent = mode === 'sign-in' ? 'Sign In' : 'Sign Up';
  setAuthMessage('');
}

function showAuthModal() {
  authModal.classList.remove('hidden');
}

function hideAuthModal() {
  authModal.classList.add('hidden');
}

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  try {
    setAuthMessage('Processing...', false);
    if (authMode === 'sign-up') {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    setAuthMessage('Success! Loading game...', false);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use' && authMode === 'sign-up') {
      setAuthMode('sign-in');
      setAuthMessage('Email already in use. Switched to Sign In. Please enter your password.', true);
    } else {
      setAuthMessage(error.message || 'Authentication failed.', true);
    }
  }
});

signInTab.addEventListener('click', () => setAuthMode('sign-in'));
signUpTab.addEventListener('click', () => setAuthMode('sign-up'));
signOutBtn.addEventListener('click', () => auth.signOut());
googleSignInBtn.addEventListener('click', async () => {
  try {
    setAuthMessage('Opening Google sign in...', false);
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    setAuthMessage(error.message || 'Google sign-in failed.', true);
  }
});

auth.onAuthStateChanged(user => {
  if (user) {
    isAuthenticated = true;
    updateUserStatus(user);
    hideAuthModal();
    if (!currentPiece) {
      resetGame();
    } else {
      isRunning = true;
    }
  } else {
    isAuthenticated = false;
    updateUserStatus(null);
    isRunning = false;
    showAuthModal();
  }
  if (!authInitialized) {
    authInitialized = true;
    requestAnimationFrame(update);
  }
});

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const WIDTH = COLS * BLOCK;
const HEIGHT = ROWS * BLOCK;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const shapes = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

const colors = {
  I: '#4fc3f7',
  J: '#536dfe',
  L: '#ff8f00',
  O: '#ffca28',
  S: '#66bb6a',
  T: '#ab47bc',
  Z: '#ef5350',
};

let board = createBoard(ROWS, COLS);
let currentPiece = null;
let nextPiece = createPiece();
let heldPiece = null;
let canHold = true;
let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;
let isRunning = true;

function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

function createPiece() {
  const keys = Object.keys(shapes);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const matrix = shapes[type].map(row => row.slice());
  return { type, matrix, row: 0, col: Math.floor((COLS - matrix[0].length) / 2) };
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[row.length - 1 - i]));
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
}

function drawBoard() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x <= WIDTH; x += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  board.forEach((row, y) => row.forEach((cell, x) => {
    if (cell) drawCell(x, y, cell);
  }));
}

function drawPiece(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(piece.col + x, piece.row + y, colors[piece.type]);
    });
  });
}

function drawPreview(canvasCtx, piece) {
  const size = 150;
  canvasCtx.clearRect(0, 0, size, size);
  if (!piece) return;
  const scale = 22;
  const offsetX = Math.floor((size - piece.matrix[0].length * scale) / 2);
  const offsetY = Math.floor((size - piece.matrix.length * scale) / 2);
  canvasCtx.fillStyle = '#0c0f14';
  canvasCtx.fillRect(0, 0, size, size);
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        canvasCtx.fillStyle = colors[piece.type];
        canvasCtx.fillRect(offsetX + x * scale + 2, offsetY + y * scale + 2, scale - 4, scale - 4);
      }
    });
  });
}

function isValidPosition(piece, offsetRow = 0, offsetCol = 0, matrix = piece.matrix) {
  return matrix.every((row, y) => row.every((value, x) => {
    if (!value) return true;
    const newX = piece.col + x + offsetCol;
    const newY = piece.row + y + offsetRow;
    return newX >= 0 && newX < COLS && newY < ROWS && (newY < 0 || !board[newY][newX]);
  }));
}

function mergePiece(piece) {
  piece.matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) {
      board[piece.row + y][piece.col + x] = colors[piece.type];
    }
  }));
}

function clearLines() {
  let lines = 0;
  board = board.filter(row => row.some(cell => !cell));
  lines = ROWS - board.length;
  while (board.length < ROWS) {
    board.unshift(Array(COLS).fill(''));
  }
  if (lines > 0) {
    score += lines * lines * 100;
    level = Math.min(15, 1 + Math.floor(score / 800));
    dropInterval = Math.max(120, 800 - (level - 1) * 45);
  }
}

function drop() {
  if (!currentPiece) return;
  if (isValidPosition(currentPiece, 1, 0)) {
    currentPiece.row += 1;
  } else {
    mergePiece(currentPiece);
    clearLines();
    spawnPiece();
  }
}

function hardDrop() {
  while (isValidPosition(currentPiece, 1, 0)) {
    currentPiece.row += 1;
    score += 2;
  }
  drop();
}

function spawnPiece() {
  currentPiece = nextPiece;
  currentPiece.row = 0;
  currentPiece.col = Math.floor((COLS - currentPiece.matrix[0].length) / 2);
  nextPiece = createPiece();
  canHold = true;
  if (!isValidPosition(currentPiece, 0, 0)) {
    isRunning = false;
    alert('Game over! Your score: ' + score);
    resetGame();
  }
}

function holdCurrent() {
  if (!canHold || !currentPiece) return;
  if (!heldPiece) {
    heldPiece = { ...currentPiece, matrix: currentPiece.matrix };
    spawnPiece();
  } else {
    const temp = heldPiece;
    heldPiece = { ...currentPiece, matrix: currentPiece.matrix };
    currentPiece = { ...temp, row: 0, col: Math.floor((COLS - temp.matrix[0].length) / 2) };
    if (!isValidPosition(currentPiece, 0, 0)) {
      isRunning = false;
      alert('Game over! Your score: ' + score);
      resetGame();
      return;
    }
  }
  canHold = false;
}

function resetGame() {
  board = createBoard(ROWS, COLS);
  nextPiece = createPiece();
  heldPiece = null;
  score = 0;
  level = 1;
  dropInterval = 800;
  isRunning = true;
  spawnPiece();
}

function draw() {
  drawBoard();
  if (currentPiece) drawPiece(currentPiece);
  scoreElement.textContent = score;
  levelElement.textContent = level;
  drawPreview(nextCtx, nextPiece);
  drawPreview(holdCtx, heldPiece);
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  if (!authInitialized) {
    requestAnimationFrame(update);
    return;
  }
  if (!isRunning || !isAuthenticated) {
    requestAnimationFrame(update);
    return;
  }
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    drop();
    dropCounter = 0;
  }
  draw();
  requestAnimationFrame(update);
}

window.addEventListener('keydown', event => {
  if (!currentPiece || !isRunning) return;
  switch (event.key) {
    case 'ArrowLeft':
      if (isValidPosition(currentPiece, 0, -1)) currentPiece.col -= 1;
      break;
    case 'ArrowRight':
      if (isValidPosition(currentPiece, 0, 1)) currentPiece.col += 1;
      break;
    case 'ArrowDown':
      if (isValidPosition(currentPiece, 1, 0)) {
        currentPiece.row += 1;
        score += 1;
      }
      break;
    case 'ArrowUp':
      const rotated = rotate(currentPiece.matrix);
      if (isValidPosition(currentPiece, 0, 0, rotated)) {
        currentPiece.matrix = rotated;
      }
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
    case 'c':
    case 'C':
      holdCurrent();
      break;
  }
});

