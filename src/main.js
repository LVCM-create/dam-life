const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const INITIAL_PLAYER_X = canvas.width / 2;
const INITIAL_PLAYER_Y = canvas.height / 2;
const INITIAL_PREDATOR_X = 80;
const INITIAL_PREDATOR_Y = 80;

const input = createInputState();
const player = createPlayer(INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
const predator = createPredator(INITIAL_PREDATOR_X, INITIAL_PREDATOR_Y);
const resources = createResourceState();

let waterLevel = 0;
let targetWaterLevel = 0;
let gameOver = false;
let hasWon = false;
let blockedDuration = 0;

let lastTime = performance.now();

function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    gatherRequested: false,
    buildRequested: false,
  };
}

function createPlayer(x, y) {
  return {
    x,
    y,
    size: 28,
    speed: 220,
    color: "#7b4b2a",
  };
}

function createPredator(x, y) {
  return {
    x,
    y,
    size: 28,
    speed: 120,
    state: "normal",
    color: "#c3342f",
  };
}

function createResourceState() {
  return {
    wood: 0,
    trees: createTrees(),
    damTiles: [],
  };
}

function createTrees() {
  return [
    { x: 100, y: 90, radius: 18, woodValue: 2 },
    { x: 210, y: 100, radius: 18, woodValue: 2 },
    { x: 330, y: 95, radius: 18, woodValue: 2 },
    { x: 470, y: 90, radius: 18, woodValue: 2 },
    { x: 620, y: 105, radius: 18, woodValue: 2 },
    { x: 730, y: 120, radius: 18, woodValue: 2 },
    { x: 120, y: 370, radius: 18, woodValue: 2 },
    { x: 240, y: 390, radius: 18, woodValue: 2 },
    { x: 390, y: 360, radius: 18, woodValue: 2 },
    { x: 540, y: 385, radius: 18, woodValue: 2 },
    { x: 670, y: 365, radius: 18, woodValue: 2 },
    { x: 760, y: 320, radius: 18, woodValue: 2 },
  ];
}

function setDirectionKey(key, isPressed) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "w" || normalizedKey === "arrowup") input.up = isPressed;
  if (normalizedKey === "s" || normalizedKey === "arrowdown") input.down = isPressed;
  if (normalizedKey === "a" || normalizedKey === "arrowleft") input.left = isPressed;
  if (normalizedKey === "d" || normalizedKey === "arrowright") input.right = isPressed;
}

window.addEventListener("keydown", (event) => {
  const normalizedKey = event.key.toLowerCase();
  setDirectionKey(event.key, true);

  if (normalizedKey === "e" && !event.repeat) {
    input.gatherRequested = true;
  }

  if ((normalizedKey === "b" || normalizedKey === " ") && !event.repeat) {
    input.buildRequested = true;
  }

  if (normalizedKey === "r" && (gameOver || hasWon) && !event.repeat) {
    restartGame();
  }
});

window.addEventListener("keyup", (event) => {
  setDirectionKey(event.key, false);
});

function update(deltaTime) {
  if (gameOver || hasWon) return;

  let moveX = 0;
  let moveY = 0;

  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;

  const movingDiagonally = moveX !== 0 && moveY !== 0;
  if (movingDiagonally) {
    const diagonalScale = Math.SQRT1_2;
    moveX *= diagonalScale;
    moveY *= diagonalScale;
  }

  player.x += moveX * player.speed * deltaTime;
  player.y += moveY * player.speed * deltaTime;

  const halfSize = player.size / 2;
  player.x = clamp(player.x, halfSize, canvas.width - halfSize);
  player.y = clamp(player.y, halfSize, canvas.height - halfSize);

  if (input.gatherRequested) {
    tryGatherWood();
    input.gatherRequested = false;
  }

  if (input.buildRequested) {
    tryPlaceDamTile();
    input.buildRequested = false;
  }

  updatePredator(deltaTime);
  checkGameOver();
  updateWinCondition(deltaTime);
  updateWaterLevel(deltaTime);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGround();
  drawDamTiles();
  drawTrees();
  drawPlayer();
  drawPredator();
  drawWaterOverlay();
  drawHud();

  if (gameOver) {
    drawGameOverMessage();
  } else if (hasWon) {
    drawWinMessage();
  }
}

function drawGround() {
  ctx.fillStyle = "#9dd7ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTrees() {
  for (const tree of resources.trees) {
    drawTree(tree);
  }
}

function drawDamTiles() {
  for (const tile of resources.damTiles) {
    drawDamTile(tile);
  }
}

function drawTree(tree) {
  ctx.fillStyle = "#6a3f22";
  ctx.fillRect(tree.x - 5, tree.y + 8, 10, 16);

  ctx.beginPath();
  ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2f8f3d";
  ctx.fill();
}

function drawPlayer() {
  const halfSize = player.size / 2;
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x - halfSize, player.y - halfSize, player.size, player.size);
}

function drawPredator() {
  const halfSize = predator.size / 2;
  ctx.fillStyle = getPredatorColor();
  ctx.fillRect(predator.x - halfSize, predator.y - halfSize, predator.size, predator.size);
}

function drawDamTile(tile) {
  const halfSize = tile.size / 2;
  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(tile.x - halfSize, tile.y - halfSize, tile.size, tile.size);

  ctx.strokeStyle = "#4f3723";
  ctx.lineWidth = 2;
  ctx.strokeRect(tile.x - halfSize, tile.y - halfSize, tile.size, tile.size);
}

function drawHud() {
  ctx.fillStyle = "#163426";
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillText(`Wood: ${resources.wood}`, 16, 34);
  ctx.fillText(`Water: ${waterLevel.toFixed(1)}`, 16, 66);
}

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateWaterLevel(deltaTime) {
  targetWaterLevel = getTargetWaterLevel();
  const waterRiseSpeed = 25;
  waterLevel = moveTowards(waterLevel, targetWaterLevel, waterRiseSpeed * deltaTime);
}

function getTargetWaterLevel() {
  const waterPerDamTile = 10;
  const unclampedTarget = resources.damTiles.length * waterPerDamTile;
  return clamp(unclampedTarget, 0, getMaxWaterLevel());
}

function getMaxWaterLevel() {
  return 100;
}

function moveTowards(current, target, maxStep) {
  if (current < target) return Math.min(current + maxStep, target);
  if (current > target) return Math.max(current - maxStep, target);
  return current;
}

function drawWaterOverlay() {
  const waterRatio = waterLevel / getMaxWaterLevel();
  const waterHeight = canvas.height * waterRatio;

  if (waterHeight <= 0) return;

  ctx.fillStyle = "rgba(30, 120, 220, 0.35)";
  ctx.fillRect(0, canvas.height - waterHeight, canvas.width, waterHeight);

  ctx.strokeStyle = "rgba(20, 90, 180, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - waterHeight);
  ctx.lineTo(canvas.width, canvas.height - waterHeight);
  ctx.stroke();
}

function drawGameOverMessage() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "24px Helvetica, Arial, sans-serif";
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 24);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawWinMessage() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText("You Win", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "24px Helvetica, Arial, sans-serif";
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 24);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function tryGatherWood() {
  const gatherDistance = 48;
  const nearbyTreeIndex = resources.trees.findIndex((tree) => {
    const distance = getDistance(player.x, player.y, tree.x, tree.y);
    return distance <= gatherDistance;
  });

  if (nearbyTreeIndex === -1) return;

  const gatheredTree = resources.trees[nearbyTreeIndex];
  resources.wood += gatheredTree.woodValue;
  resources.trees.splice(nearbyTreeIndex, 1);
}

function tryPlaceDamTile() {
  const damCost = 1;
  if (resources.wood < damCost) return;

  const tileSize = 24;
  const tile = {
    x: snapToGrid(player.x, tileSize),
    y: snapToGrid(player.y, tileSize),
    size: tileSize,
  };

  const alreadyPlaced = resources.damTiles.some((existingTile) => {
    return existingTile.x === tile.x && existingTile.y === tile.y;
  });
  if (alreadyPlaced) return;

  resources.wood -= damCost;
  resources.damTiles.push(tile);
}

function updatePredator(deltaTime) {
  const waterEffect = getPredatorWaterEffect();
  predator.state = waterEffect.state;

  if (waterEffect.speedMultiplier <= 0) return;

  const dx = player.x - predator.x;
  const dy = player.y - predator.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.001) return;

  const dirX = dx / distance;
  const dirY = dy / distance;
  const effectiveSpeed = predator.speed * waterEffect.speedMultiplier;
  predator.x += dirX * effectiveSpeed * deltaTime;
  predator.y += dirY * effectiveSpeed * deltaTime;

  const halfSize = predator.size / 2;
  predator.x = clamp(predator.x, halfSize, canvas.width - halfSize);
  predator.y = clamp(predator.y, halfSize, canvas.height - halfSize);
}

function getPredatorWaterEffect() {
  const mediumWaterThreshold = 35;
  const highWaterThreshold = 55;

  if (waterLevel >= highWaterThreshold) {
    return { state: "blocked", speedMultiplier: 0 };
  }

  if (waterLevel >= mediumWaterThreshold) {
    return { state: "slowed", speedMultiplier: 0.45 };
  }

  return { state: "normal", speedMultiplier: 1 };
}

function getPredatorColor() {
  if (predator.state === "blocked") return "#6b7280";
  if (predator.state === "slowed") return "#d97706";
  return predator.color;
}

function checkGameOver() {
  const reachDistance = (player.size + predator.size) / 2;
  const predatorDistance = getDistance(player.x, player.y, predator.x, predator.y);

  if (predatorDistance <= reachDistance) {
    gameOver = true;
  }
}

function updateWinCondition(deltaTime) {
  if (gameOver) return;

  const requiredBlockedDuration = 5;
  if (predator.state === "blocked") {
    blockedDuration += deltaTime;
    if (blockedDuration >= requiredBlockedDuration) {
      hasWon = true;
    }
    return;
  }

  blockedDuration = 0;
}

function restartGame() {
  player.x = INITIAL_PLAYER_X;
  player.y = INITIAL_PLAYER_Y;

  predator.x = INITIAL_PREDATOR_X;
  predator.y = INITIAL_PREDATOR_Y;
  predator.state = "normal";

  resources.wood = 0;
  resources.trees = createTrees();
  resources.damTiles = [];

  waterLevel = 0;
  targetWaterLevel = 0;
  gameOver = false;
  hasWon = false;
  blockedDuration = 0;
  clearInputState();
  lastTime = performance.now();
}

function clearInputState() {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.gatherRequested = false;
  input.buildRequested = false;
}

function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

function getDistance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

requestAnimationFrame(gameLoop);
