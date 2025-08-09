// main.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileSize = 30;
const mapRows = 15;
const mapCols = 28;

canvas.width = tileSize * mapCols; // 840 px
canvas.height = tileSize * mapRows; // 450 px

// 0 = boş (yol), 1 = duvar (mavi), 2 = yem (beyaz küçük daire)
const rawMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,0,1,2,1,2,1,2,1,0,0,0,0,0,1,2,1,2,1,0,1,2,1,0,2,1],
  [1,2,1,0,1,2,1,2,1,2,1,0,1,1,1,0,1,2,1,2,1,0,1,2,1,0,2,1],
  [1,2,1,0,1,2,1,2,1,2,1,0,1,0,1,0,1,2,1,2,1,0,1,2,1,0,2,1],
  [1,2,1,0,0,2,0,0,1,2,0,0,1,0,1,0,0,2,0,0,1,0,0,2,0,0,2,1],
  [1,2,1,1,1,1,1,2,1,1,1,2,1,0,1,1,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,0,0,0,0,1,2,0,0,0,2,0,0,0,0,0,2,0,2,1,0,0,0,0,0,2,1],
  [1,2,1,1,1,0,1,2,1,1,1,1,1,0,1,1,1,2,1,2,1,0,1,1,1,1,2,1],
  [1,2,0,0,1,0,0,0,0,2,2,2,1,0,0,0,1,2,0,0,1,0,1,0,0,2,2,1],
  [1,2,1,0,1,1,1,1,1,2,1,0,1,1,1,0,1,2,1,1,1,0,1,0,1,1,2,1],
  [1,2,0,0,0,0,0,0,1,2,1,0,0,0,0,0,1,2,0,0,0,0,1,0,0,0,2,1],
  [1,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Düşman resmi
const enemyImage = new Image();
enemyImage.src =
  "https://pbs.twimg.com/profile_images/1952877004568633344/K1G83GYc_400x400.jpg";

let map = [];
let score = 0;
let username = "";
let gameStarted = false;
let waitingForSpace = true;
let gameOver = false;

let pacman = {
  x: tileSize * 1.5,
  y: tileSize * 1.5,
  dx: 2,
  dy: 0,
  direction: "right",
};

let enemy = {
  x: tileSize * 26.5,
  y: tileSize * 13.5,
  size: tileSize,
  speed: 1.6,
};

// HTML elementleri
const loginOverlay = document.getElementById("loginOverlay");
const messageOverlay = document.getElementById("messageOverlay");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const winOverlay = document.getElementById("winOverlay");
const startBtn = document.getElementById("startBtn");
const confirmBtn = document.getElementById("confirmBtn");
const usernameInput = document.getElementById("usernameInput");
const welcomeText = document.getElementById("welcomeText");
const scoreDisplay = document.getElementById("scoreDisplay");
const userDisplay = document.getElementById("userDisplay");

const eatSound = document.getElementById("eatSound");
const gameOverSound = document.getElementById("gameOverSound");

// Initialize map (deep copy rawMap)
function initMap() {
  map = rawMap.map(row => row.slice());
}

// Çizim fonksiyonları
function drawMap() {
  for (let r = 0; r < mapRows; r++) {
    for (let c = 0; c < mapCols; c++) {
      if (map[r][c] === 1) {
        ctx.fillStyle = "blue";
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
      } else if (map[r][c] === 2) {
        // Yemler
        ctx.fillStyle = "white";
        const cx = c * tileSize + tileSize / 2;
        const cy = r * tileSize + tileSize / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}

function drawPacman() {
  const centerX = pacman.x;
  const centerY = pacman.y;
  const radius = tileSize / 2;

  ctx.beginPath();

  let startAngle, endAngle;

  switch (pacman.direction) {
    case "right":
      startAngle = 0.25 * Math.PI;
      endAngle = 1.75 * Math.PI;
      break;
    case "left":
      startAngle = 1.25 * Math.PI;
      endAngle = 0.75 * Math.PI;
      break;
    case "up":
      startAngle = 1.75 * Math.PI;
      endAngle = 1.25 * Math.PI;
      break;
    case "down":
      startAngle = 0.75 * Math.PI;
      endAngle = 0.25 * Math.PI;
      break;
  }

  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
  ctx.closePath();

  ctx.fillStyle = "yellow";
  ctx.fill();
}

function drawEnemy() {
  ctx.drawImage(enemyImage, enemy.x - tileSize / 2, enemy.y - tileSize / 2, tileSize, tileSize);
}

// Haritada çarpışma kontrolü (duvar mı)
function isWall(x, y) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return true;
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  return map[row][col] === 1;
}
// Haritada sadece yol kontrolü (0 veya 2 olan kareler)
function isPath(x, y) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  return map[row][col] !== 1;
}


// Yem yeme kontrolü
function eatPellet() {
  const col = Math.floor(pacman.x / tileSize);
  const row = Math.floor(pacman.y / tileSize);
  if (map[row][col] === 2) {
    map[row][col] = 0;
    score++;
    updateScoreDisplay();
    eatSound.currentTime = 0;
    eatSound.play();
        // Tüm yemler bitti mi kontrol et
    if (!map.flat().includes(2)) {
      gameOver = true;
      gameStarted = false;
      waitingForSpace = true;
      winOverlay.classList.remove("hidden");
      startOverlay.classList.add("hidden");
    }
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

// Pacman hareketi ve çarpışma kontrolü
function movePacman() {
  const nextX = pacman.x + pacman.dx;
  const nextY = pacman.y + pacman.dy;
  const radius = tileSize / 2;

  // Pacman'ın 4 çevresinden noktalarla duvar kontrolü
  const pointsToCheck = [
    { x: nextX + (pacman.dx > 0 ? radius : pacman.dx < 0 ? -radius : 0), y: pacman.y },
    { x: nextX, y: nextY + (pacman.dy > 0 ? radius : pacman.dy < 0 ? -radius : 0) },
  ];

  for (const pt of pointsToCheck) {
    if (isWall(pt.x, pt.y)) {
      return; // Duvar varsa hareket yok
    }
  }

  pacman.x = nextX;
  pacman.y = nextY;
}

// Yeni global değişken düşmanın hareket yönünü tutacak
function moveEnemy() {
  const dx = pacman.x - enemy.x;
  const dy = pacman.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const vx = (dx / dist) * enemy.speed;
  const vy = (dy / dist) * enemy.speed;

  const nextX = enemy.x + vx;
  const nextY = enemy.y + vy;

  if (isPath(nextX, enemy.y)) {
    enemy.x = nextX;
  } else if (isPath(enemy.x, nextY)) {
    enemy.y = nextY;
  } else {
    const directions = [
      { x: enemy.speed, y: 0 },
      { x: -enemy.speed, y: 0 },
      { x: 0, y: enemy.speed },
      { x: 0, y: -enemy.speed },
    ];

    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      if (isPath(enemy.x + dir.x, enemy.y + dir.y)) {
        enemy.x += dir.x;
        enemy.y += dir.y;
        break;
      }
    }
  }
}




// Çarpışma kontrolü (Pacman ve düşman)
function collideWithEnemy() {
  const distX = Math.abs(pacman.x - enemy.x);
  const distY = Math.abs(pacman.y - enemy.y);
  const threshold = tileSize * 0.7;
  return distX < threshold && distY < threshold;
}

function resetGame() {
  initMap();
  score = 0;
  updateScoreDisplay();

  pacman.x = tileSize * 1.5;
  pacman.y = tileSize * 1.5;
  pacman.dx = 2;
  pacman.dy = 0;
  pacman.direction = "right";

  enemy.x = tileSize * 26.5;
  enemy.y = tileSize * 13.5;

  gameOver = false;
  gameStarted = false;
  waitingForSpace = true;

  startOverlay.classList.remove("hidden");
  gameOverOverlay.classList.add("hidden");
  winOverlay.classList.add("hidden");
}

// Oyun döngüsü
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawEnemy();
  drawPacman();

  if (gameStarted && !gameOver) {
    movePacman();
    eatPellet();

    moveEnemy();

    if (collideWithEnemy()) {
      // Oyun bitti
      gameOver = true;
      gameStarted = false;
      waitingForSpace = true;
      gameOverOverlay.classList.remove("hidden");
      startOverlay.classList.add("hidden");
      gameOverSound.currentTime = 0;
      gameOverSound.play();
    }
  }

  requestAnimationFrame(update);
}

// Kullanıcı giriş ve oyun başlangıç
startBtn.onclick = () => {
  const val = usernameInput.value.trim();
  if (!val) {
    alert("Please enter your username.");
    return;
  }
  username = val;
  userDisplay.textContent = `User: ${username}`;

  loginOverlay.classList.add("hidden");
  welcomeText.textContent = `${username} - 
  You Have Earned The Right to Join The LAMUMU Universe!`;
  messageOverlay.classList.remove("hidden");
};

confirmBtn.onclick = () => {
  messageOverlay.classList.add("hidden");
  startOverlay.classList.remove("hidden");
};

window.addEventListener("keydown", (e) => {
  if (!gameStarted && waitingForSpace && e.code === "Space") {
    if (gameOver) {
      resetGame();
    }
    gameStarted = true;
    waitingForSpace = false;
    startOverlay.classList.add("hidden");
  }

  if (!gameStarted) return;

  switch (e.code) {
    case "ArrowUp":
      pacman.dx = 0;
      pacman.dy = -2;
      pacman.direction = "up";
      break;
    case "ArrowDown":
      pacman.dx = 0;
      pacman.dy = 2;
      pacman.direction = "down";
      break;
    case "ArrowLeft":
      pacman.dx = -2;
      pacman.dy = 0;
      pacman.direction = "left";
      break;
    case "ArrowRight":
      pacman.dx = 2;
      pacman.dy = 0;
      pacman.direction = "right";
      break;
  }
});

initMap();
update();
