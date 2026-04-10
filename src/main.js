import { createPredator, drawPredator } from "./predator.js";
import { createPlayer, drawPlayer } from "./player.js";
import { clamp, moveTowards, snapToGrid, getDistance } from "./utils.js";
import { createTerrainState, isPointInMud, isPointInReeds } from "./terrain.js";
import { getDamEfficiencyTier, getDamEfficiencyValue, getTotalDamStrength, getPrimeDamBand } from "./dam.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const HOME_X = canvas.width / 2;
const HOME_Y = canvas.height / 2;
const INITIAL_PLAYER_X = HOME_X + 28;
const INITIAL_PLAYER_Y = HOME_Y + 10;
const INITIAL_PREDATOR_X = canvas.width - 90;
const INITIAL_PREDATOR_Y = 90;
const PREDATOR_AWARENESS_DELAY = 2.5;
const INVALID_BUILD_FEEDBACK_DURATION = 0.22;
const WOOD_PICKUP_PULSE_DURATION = 0.18;
const DAM_PULSE_DURATION = 0.18;
const HIT_SHAKE_DURATION = 0.26;
const WIN_REQUIRED_POND_RADIUS = 262;
const REEDS_DETECTION_RADIUS = 160;
const REEDS_CHASE_SPEED_MULTIPLIER = 0.85;
const PREDATOR_CIRCLE_MIN_DURATION = 0.8;
const PREDATOR_CIRCLE_MAX_DURATION = 1.4;
const PHASE_INTRO = "intro";
const PHASE_INSTRUCTIONS = "instructions";
const PHASE_PLAYING = "playing";

const input = createInputState();
const player = createPlayer(INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
const predator = createPredator(INITIAL_PREDATOR_X, INITIAL_PREDATOR_Y);
const resources = createResourceState();
const terrainState = createTerrainState();

let waterLevel = 0;
let targetWaterLevel = 0;
let gameOver = false;
let hasWon = false;
let winHoldDuration = 0;
let predatorAwarenessTimer = 0;
let invalidBuildFeedbackTimer = 0;
let invalidBuildFeedback = { x: 0, y: 0, size: 24 };
let damPlacementEffects = [];
let screenShakeTimer = 0;
let screenShakeStrength = 0;
let runTime = 0;
let pondStability = 0;
let gameStarted = false;
let gamePhase = PHASE_INTRO;
let introAnimTime = 0;
let finalStats = { timeSurvived: 0, pondSize: 0 };

let audioContext = null;
let ambientWaterGain = null;
let ambientRetryIntervalId = null;

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

  if (normalizedKey === "e" && !event.repeat) {
    if (gamePhase === PHASE_PLAYING) input.gatherRequested = true;
  }

  if ((normalizedKey === "b" || normalizedKey === " ") && !event.repeat) {
    if (gamePhase === PHASE_PLAYING) input.buildRequested = true;
  }

  // Temporary debug support for ambient audio.
  if (normalizedKey === "m" && !event.repeat) {
    console.log("[audio] manual ambient trigger");
    ensureAudioStarted();
  }

  if (normalizedKey === "r" && (gameOver || hasWon) && !event.repeat) {
    restartGame();
    return;
  }

  if (gamePhase === PHASE_INTRO && !event.repeat) {
    gamePhase = PHASE_INSTRUCTIONS;
    return;
  }

  if (gamePhase === PHASE_INSTRUCTIONS && !event.repeat) {
    gamePhase = PHASE_PLAYING;
    gameStarted = true;
    predatorAwarenessTimer = 0;
    return;
  }

  if (gamePhase !== PHASE_PLAYING) {
    return;
  }

  setDirectionKey(event.key, true);
});

window.addEventListener("keyup", (event) => {
  if (gamePhase !== PHASE_PLAYING) return;
  setDirectionKey(event.key, false);
});

function update(deltaTime) {
  if (gamePhase === PHASE_PLAYING) {
    updateFeedbackEffects(deltaTime);
  }
  updatePresentationState(deltaTime);
  if (gameOver || hasWon) return;
  if (gamePhase !== PHASE_PLAYING) return;
  const maxTilt = 12 * (Math.PI / 180);
  const tiltSpeed = 5.5;

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

  if (moveX !== 0) {
    player.facingX = moveX;
  }
  if (moveY < 0) player.targetTilt = -maxTilt;
  if (moveY > 0) player.targetTilt = maxTilt;
  if (moveY === 0) player.targetTilt = 0;
  player.tilt = moveTowards(player.tilt, player.targetTilt, tiltSpeed * deltaTime);

  const terrainSpeedMultiplier = getBeaverTerrainSpeedMultiplier();
  const beaverSpeed = player.speed * terrainSpeedMultiplier;
  player.x += moveX * beaverSpeed * deltaTime;
  player.y += moveY * beaverSpeed * deltaTime;

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

function updatePresentationState(deltaTime) {
  if (gamePhase === PHASE_INTRO) {
    introAnimTime += deltaTime;
  }

  if (gamePhase === PHASE_PLAYING && !gameOver && !hasWon) {
    runTime += deltaTime;
  }

  pondStability = getPondStabilityPercent();
}

function getBeaverTerrainSpeedMultiplier() {
  const pond = getPondGeometry();
  const distanceFromLodge = getDistanceFromPondCenter(player.x, player.y, pond);
  const isInPond = distanceFromLodge <= pond.outerRadius;

  if (isInPond) return 1;
  if (isPointInMud(player.x, player.y, terrainState)) return 0.28;
  return 0.45;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gamePhase === PHASE_INTRO) {
    drawIntroScreen();
    return;
  }

  const shake = getScreenShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawGround();
  drawTerrain();
  drawStream();
  drawWaterOverlay();
  drawLodge();
  drawDamTiles();
  drawDamPlacementEffects();
  drawInvalidBuildFeedback();
  drawTrees();
 drawPlayer(ctx, player, getQuickPulseScale, WOOD_PICKUP_PULSE_DURATION);
  drawPredator(ctx, predator, getPredatorColor());
  ctx.restore();
  drawHud();

  if (gamePhase === PHASE_INSTRUCTIONS) {
    drawInstructionOverlay();
  }

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

function drawTerrain() {
  drawMudZones();
  drawReedZones();
}

function drawMudZones() {
  for (const zone of terrainState.mudZones) {
    ctx.fillStyle = "rgba(122, 88, 57, 0.55)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(87, 56, 33, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
  }
}

function drawReedZones() {
  for (const zone of terrainState.reedZones) {
    ctx.fillStyle = "rgba(127, 177, 95, 0.32)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(75, 126, 58, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    drawReedBlades(zone);
  }
}

function drawReedBlades(zone) {
  const spacing = 18;
  ctx.strokeStyle = "rgba(58, 116, 48, 0.72)";
  ctx.lineWidth = 1.2;

  for (let x = zone.x + 8; x <= zone.x + zone.width - 8; x += spacing) {
    for (let y = zone.y + 8; y <= zone.y + zone.height - 8; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x + 2, y - 6);
      ctx.stroke();
    }
  }
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


function drawDamPlacementEffects() {
  for (const effect of damPlacementEffects) {
    const lifeRatio = effect.timer / DAM_PULSE_DURATION;
    const size = effect.size * (1.0 + (1 - lifeRatio) * 0.45);
    const alpha = 0.15 + lifeRatio * 0.45;
    const halfSize = size / 2;

    ctx.fillStyle = `rgba(${effect.fillRgb}, ${alpha})`;
    ctx.fillRect(effect.x - halfSize, effect.y - halfSize, size, size);
    ctx.strokeStyle = `rgba(${effect.strokeRgb}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(effect.x - halfSize, effect.y - halfSize, size, size);
  }
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
  const hudY = 18;
  const leftMargin = 26;
  const rightMargin = 26;

  // Fixed horizontal slots prevent overlap between sections.
  const woodSectionX = leftMargin;
  const progressTextX = 230;
  const progressBarX = 430;

  drawWoodDisplay(woodSectionX, hudY, resources.wood);

  const progressLabel = `Progress: ${Math.round(pondStability)}%`;
  ctx.fillStyle = "#163426";
  ctx.font = "bold 19px Helvetica, Arial, sans-serif";
  ctx.fillText(progressLabel, progressTextX, hudY + 20);

  const progressBarWidth = Math.max(120, canvas.width - progressBarX - rightMargin);
  drawStabilityBar(progressBarX, hudY + 10, progressBarWidth, 10, pondStability / 100);
}

function drawWoodDisplay(x, y, woodCount) {
  const iconWidth = 34;
  const iconHeight = 14;
  const iconY = y + 6;

  // Simple log icon (consistent brown palette with dam tiles).
  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(x, iconY, iconWidth, iconHeight);
  ctx.strokeStyle = "#4f3723";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, iconY, iconWidth, iconHeight);

  ctx.fillStyle = "#9e7a56";
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, iconY + iconHeight / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e432c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, iconY + iconHeight / 2, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#163426";
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  ctx.fillText(`x${woodCount}`, x + iconWidth + 16, y + 20);
}

function drawStabilityBar(x, y, width, height, fillRatio) {
  const ratio = clamp(fillRatio, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(35, 71, 84, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "rgba(45, 134, 211, 0.9)";
  ctx.fillRect(x, y, width * ratio, height);
}

function drawIntroScreen() {
  drawIntroLandscape();
  drawIntroHelicopter();
  drawIntroParachuteBeaver();
  drawGameTitle(canvas.width / 2, 74, 66);

  const boxWidth = canvas.width - 280;
  const boxHeight = 152;
  const boxX = (canvas.width - boxWidth) / 2;
  const boxY = canvas.height - boxHeight - 78;

  ctx.fillStyle = "rgba(10, 26, 18, 0.64)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#f7f6ef";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 29px Helvetica, Arial, sans-serif";
  ctx.fillText("Good news!", canvas.width / 2, boxY + 38);
  ctx.font = "21px Helvetica, Arial, sans-serif";
  ctx.fillText("Your friends at the Nature Conservancy", canvas.width / 2, boxY + 70);
  ctx.fillText("have parachuted you into the perfect spot", canvas.width / 2, boxY + 98);
  ctx.fillText("to start a new life.", canvas.width / 2, boxY + 126);

  const promptAlpha = 0.56 + (Math.sin(introAnimTime * 4.2) * 0.5 + 0.5) * 0.44;
  ctx.fillStyle = `rgba(247, 246, 239, ${promptAlpha})`;
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText("Press any key to start", canvas.width / 2, canvas.height - 24);
}

function drawIntroLandscape() {
  // Sky
  ctx.fillStyle = "#9fd8ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds (simple blocky style)
  drawCloud(120, 86, 1.1);
  drawCloud(300, 62, 0.9);
  drawCloud(560, 96, 1.15);
  drawCloud(700, 70, 0.75);

  // Ground layers
  ctx.fillStyle = "#6fa053";
  ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);
  ctx.fillStyle = "#5b8b44";
  ctx.fillRect(0, canvas.height * 0.78, canvas.width, canvas.height * 0.22);

}

function drawIntroHelicopter() {
  const x = ((introAnimTime * 20) % (canvas.width + 140)) - 70;
  const y = 84 + Math.sin(introAnimTime * 0.8) * 5;

  ctx.fillStyle = "#3d4f5c";
  ctx.fillRect(x - 24, y - 8, 44, 16);
  ctx.fillStyle = "#6f8796";
  ctx.fillRect(x + 16, y - 4, 14, 8);
  ctx.strokeStyle = "#2b3a44";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 12);
  ctx.lineTo(x + 28, y - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 12);
  ctx.lineTo(x + 18, y + 12);
  ctx.stroke();
}

function drawIntroParachuteBeaver() {
  const centerX = canvas.width / 2;
  const baseY = 116 + Math.sin(introAnimTime * 1.3) * 5;

  ctx.fillStyle = "#f15d5d";
  ctx.beginPath();
  ctx.arc(centerX, baseY, 34, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f4e9d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 24, baseY);
  ctx.lineTo(centerX - 8, baseY + 42);
  ctx.moveTo(centerX + 24, baseY);
  ctx.lineTo(centerX + 8, baseY + 42);
  ctx.stroke();

  ctx.fillStyle = "#7b4b2a";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 50, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(centerX + 6, baseY + 49, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(x, y, scale) {
  const w = 52 * scale;
  const h = 22 * scale;
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.fillRect(x, y, w, h);
  ctx.fillRect(x - 16 * scale, y + 8 * scale, w * 0.55, h * 0.72);
  ctx.fillRect(x + w * 0.56, y + 6 * scale, w * 0.5, h * 0.75);
}

function drawInstructionOverlay() {
  drawGameTitle(canvas.width / 2, 54, 38);

  const panelX = 22;
  const panelY = 104;
  const panelWidth = 360;
  const panelHeight = 190;

  ctx.fillStyle = "rgba(12, 18, 20, 0.64)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#f7f6ef";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillText("How to play", panelX + 18, panelY + 36);
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText("Move: WASD / Arrow Keys", panelX + 18, panelY + 72);
  ctx.fillText("Collect wood: E", panelX + 18, panelY + 102);
  ctx.fillText("Build dam: B or Space (in stream)", panelX + 18, panelY + 132);
  ctx.fillText("Goal: Grow your pond and stay safe.", panelX + 18, panelY + 162);

  const promptWidth = 318;
  const promptHeight = 36;
  const promptX = (canvas.width - promptWidth) / 2;
  const promptY = canvas.height - 56;
  const promptAlpha = 0.52 + (Math.sin(introAnimTime * 4) * 0.5 + 0.5) * 0.24;

  ctx.fillStyle = `rgba(12, 18, 20, ${promptAlpha})`;
  ctx.fillRect(promptX, promptY - 24, promptWidth, promptHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(247, 246, 239, 0.9)";
  ctx.font = "19px Helvetica, Arial, sans-serif";
  ctx.fillText("Press any key to start", canvas.width / 2, promptY);
}

function drawStream() {
  const stream = getStreamGeometry();
  drawStreamBand(stream, "rgba(128, 200, 248, 0.55)");
  drawStreamBand(
    {
      ...stream,
      leftHeight: stream.leftHeight * 0.52,
      rightHeight: stream.rightHeight * 0.52,
    },
    "rgba(64, 153, 222, 0.55)"
  );
  drawPrimeDamBand(stream);

  ctx.strokeStyle = "rgba(44, 114, 171, 0.85)";
  ctx.lineWidth = 2;
  drawStreamPath(stream);
  ctx.stroke();
}

function drawPrimeDamBand(stream) {
  const band = getPrimeDamBand(stream);
  ctx.fillStyle = "rgba(76, 196, 102, 0.22)";
  ctx.fillRect(band.x, band.y, band.width, band.height);
  ctx.strokeStyle = "rgba(49, 139, 70, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(band.x, band.y, band.width, band.height);
}

function drawStreamBand(stream, color) {
  ctx.fillStyle = color;
  drawStreamPath(stream);
  ctx.fill();
}

function drawStreamPath(stream) {
  const leftHalf = stream.leftHeight / 2;
  const rightHalf = stream.rightHeight / 2;

  ctx.beginPath();
  ctx.moveTo(stream.startX, stream.centerY - leftHalf);
  ctx.lineTo(stream.endX, stream.centerY - rightHalf);
  ctx.lineTo(stream.endX, stream.centerY + rightHalf);
  ctx.lineTo(stream.startX, stream.centerY + leftHalf);
  ctx.closePath();
}

function drawInvalidBuildFeedback() {
  if (invalidBuildFeedbackTimer <= 0) return;

  const lifeRatio = invalidBuildFeedbackTimer / INVALID_BUILD_FEEDBACK_DURATION;
  const alpha = 0.25 + lifeRatio * 0.45;
  const halfSize = invalidBuildFeedback.size / 2;

  ctx.fillStyle = `rgba(214, 47, 47, ${alpha})`;
  ctx.fillRect(
    invalidBuildFeedback.x - halfSize,
    invalidBuildFeedback.y - halfSize,
    invalidBuildFeedback.size,
    invalidBuildFeedback.size
  );

  ctx.strokeStyle = `rgba(150, 20, 20, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    invalidBuildFeedback.x - halfSize,
    invalidBuildFeedback.y - halfSize,
    invalidBuildFeedback.size,
    invalidBuildFeedback.size
  );
}

function updateFeedbackEffects(deltaTime) {
  invalidBuildFeedbackTimer = Math.max(0, invalidBuildFeedbackTimer - deltaTime);
  player.pickupPulseTimer = Math.max(0, player.pickupPulseTimer - deltaTime);
  screenShakeTimer = Math.max(0, screenShakeTimer - deltaTime);

  for (const effect of damPlacementEffects) {
    effect.timer = Math.max(0, effect.timer - deltaTime);
  }
  damPlacementEffects = damPlacementEffects.filter((effect) => effect.timer > 0);
}

function getQuickPulseScale(timer, duration, maxBoost) {
  if (timer <= 0 || duration <= 0) return 1;
  const progress = 1 - timer / duration;

  if (progress < 0.5) {
    return 1 + maxBoost * (progress / 0.5);
  }
  return 1 + maxBoost * ((1 - progress) / 0.5);
}

function getScreenShakeOffset() {
  if (screenShakeTimer <= 0) return { x: 0, y: 0 };
  const intensity = (screenShakeTimer / HIT_SHAKE_DURATION) * screenShakeStrength;
  return {
    x: (Math.random() * 2 - 1) * intensity,
    y: (Math.random() * 2 - 1) * intensity,
  };
}

function drawLodge() {
  const lodgeWidth = 44;
  const lodgeHeight = 32;
  const lodgeX = HOME_X - lodgeWidth / 2;
  const lodgeY = HOME_Y - lodgeHeight / 2;

  ctx.fillStyle = "#6c4a2a";
  ctx.fillRect(lodgeX, lodgeY, lodgeWidth, lodgeHeight);

  ctx.fillStyle = "#2a1b11";
  ctx.fillRect(HOME_X - 7, HOME_Y - 3, 14, 19);

  ctx.strokeStyle = "#3b2718";
  ctx.lineWidth = 2;
  ctx.strokeRect(lodgeX, lodgeY, lodgeWidth, lodgeHeight);
}

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}


function updateWaterLevel(deltaTime) {
  targetWaterLevel = getTargetWaterLevel();
  const waterRiseSpeed = 25;
  waterLevel = moveTowards(waterLevel, targetWaterLevel, waterRiseSpeed * deltaTime);
}

function getTargetWaterLevel() {
  const waterPerDamStrength = 10;
  const totalDamStrength = getTotalDamStrength(resources.damTiles);
  const unclampedTarget = totalDamStrength * waterPerDamStrength;
  return clamp(unclampedTarget, 0, getMaxWaterLevel());
}

function getMaxWaterLevel() {
  return 100;
}



function drawWaterOverlay() {
  const pond = getPondGeometry();

  // Horizontal oval pond for clearer map coverage.
  ctx.save();
  ctx.translate(pond.centerX, pond.centerY);
  ctx.scale(pond.xScale, pond.yScale);

  drawPondZone(pond.outerRadius, "rgba(126, 196, 244, 0.6)");
  drawPondZone(pond.middleRadius, "rgba(61, 143, 213, 0.65)");
  drawPondZone(pond.innerRadius, "rgba(28, 90, 164, 0.72)");

  ctx.strokeStyle = "rgba(16, 71, 133, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, pond.outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPondZone(radius, color) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function getPondGeometry() {
  const waterRatio = clamp(waterLevel / getMaxWaterLevel(), 0, 1);
  const baseRadius = 95;
  const outerRadius = baseRadius + waterRatio * 190;

  return {
    centerX: HOME_X,
    centerY: HOME_Y,
    xScale: 1.16,
    yScale: 0.68,
    outerRadius,
    middleRadius: outerRadius * 0.68,
    innerRadius: outerRadius * 0.4,
  };
}

function getPondStabilityPercent() {
  const pond = getPondGeometry();
  return clamp((pond.outerRadius / WIN_REQUIRED_POND_RADIUS) * 100, 0, 100);
}

function getStreamGeometry() {
  return {
    startX: 0,
    endX: HOME_X + 52,
    centerY: HOME_Y - 8,
    leftHeight: 86,
    rightHeight: 132,
  };
}

function isPointInStream(x, y) {
  const stream = getStreamGeometry();
  if (x < stream.startX || x > stream.endX) return false;

  const t = (x - stream.startX) / (stream.endX - stream.startX);
  const heightAtX = stream.leftHeight + (stream.rightHeight - stream.leftHeight) * t;
  const halfHeight = heightAtX / 2;

  return y >= stream.centerY - halfHeight && y <= stream.centerY + halfHeight;
}

function drawGameOverMessage() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGameTitle(canvas.width / 2, canvas.height / 2 - 108, 62);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText("You Were Caught", canvas.width / 2, canvas.height / 2 - 44);
  ctx.font = "22px Helvetica, Arial, sans-serif";
  ctx.fillText(`Time survived: ${finalStats.timeSurvived.toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 2);
  ctx.fillText(`Final pond size: ${finalStats.pondSize.toFixed(1)}`, canvas.width / 2, canvas.height / 2 + 32);
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 70);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawGameTitle(x, y, fontSize) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(17, 45, 32, 0.45)";
  ctx.fillText("Dam Life", x + 2, y + 2);
  ctx.fillStyle = "#f7f6ef";
  ctx.fillText("Dam Life", x, y);
  ctx.restore();
}

function drawWinMessage() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText("You built a safe home.", canvas.width / 2, canvas.height / 2 - 44);
  ctx.font = "22px Helvetica, Arial, sans-serif";
  ctx.fillText(`Time survived: ${finalStats.timeSurvived.toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 2);
  ctx.fillText(`Final pond size: ${finalStats.pondSize.toFixed(1)}`, canvas.width / 2, canvas.height / 2 + 32);
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 70);

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
  player.pickupPulseTimer = WOOD_PICKUP_PULSE_DURATION;
  playPickupSound();
}

function tryPlaceDamTile() {
  const damCost = 1;
  if (resources.wood < damCost) return;

  const stream = getStreamGeometry();
  const tileSize = 24;
  const tile = {
    x: snapToGrid(player.x, tileSize),
    y: snapToGrid(player.y, tileSize),
    size: tileSize,
  };

  if (!isPointInStream(tile.x, tile.y)) {
    triggerInvalidBuildFeedback(tile.x, tile.y, tileSize);
    return;
  }

  const alreadyPlaced = resources.damTiles.some((existingTile) => {
    return existingTile.x === tile.x && existingTile.y === tile.y;
  });
  if (alreadyPlaced) return;

  const efficiencyTier = getDamEfficiencyTier(tile.x, tile.y, stream);
  const efficiency = getDamEfficiencyValue(efficiencyTier);
  tile.efficiencyTier = efficiencyTier;
  tile.efficiency = efficiency;

  resources.wood -= damCost;
  resources.damTiles.push(tile);
  triggerDamPlacementFeedback(tile.x, tile.y, tileSize, efficiencyTier);
  playDamPlacementSound();
}

function triggerInvalidBuildFeedback(x, y, size) {
  invalidBuildFeedback = { x, y, size };
  invalidBuildFeedbackTimer = INVALID_BUILD_FEEDBACK_DURATION;
}

function triggerDamPlacementFeedback(x, y, size, efficiencyTier) {
  const colors = getDamPlacementFeedbackColors(efficiencyTier);
  damPlacementEffects.push({
    x,
    y,
    size,
    timer: DAM_PULSE_DURATION,
    fillRgb: colors.fillRgb,
    strokeRgb: colors.strokeRgb,
  });
}

function getDamPlacementFeedbackColors(efficiencyTier) {
  if (efficiencyTier === "prime") {
    return { fillRgb: "86, 181, 108", strokeRgb: "45, 115, 61" };
  }
  return { fillRgb: "185, 150, 91", strokeRgb: "103, 73, 42" };
}

function updatePredator(deltaTime) {
  if (predatorAwarenessTimer < PREDATOR_AWARENESS_DELAY) {
    predatorAwarenessTimer += deltaTime;
    predator.state = "idle";
    return;
  }

  const pond = getPondGeometry();
  const playerInReeds = isPointInReeds(player.x, player.y, terrainState);
  const reedsSpeedMultiplier = playerInReeds ? REEDS_CHASE_SPEED_MULTIPLIER : 1;
  const pacingSpeedMultiplier = getPredatorSpeedMultiplier(runTime);
  const currentDistanceFromLodge = getDistanceFromPondCenter(predator.x, predator.y, pond);

  // Safety clamp: if predator somehow starts inside deep water, keep it on the boundary.
  if (currentDistanceFromLodge < pond.innerRadius) {
    const safePosition = projectPointToPondRadius(predator.x, predator.y, pond, pond.innerRadius + 0.1);
    predator.x = safePosition.x;
    predator.y = safePosition.y;
    beginPredatorCircling();
    return;
  }

  const pondZone = getPredatorPondZone();
  if (predator.state === "circle" && predator.stateTimer > 0) {
    // Simple pond-edge probing behavior when direct inward movement is blocked.
    updatePredatorCircleMovement(deltaTime, pond, pondZone.speedMultiplier, reedsSpeedMultiplier, pacingSpeedMultiplier);
    return;
  }

  let targetX = player.x;
  let targetY = player.y;
  let usingLastKnownPosition = false;

  const predatorDistanceToPlayer = getDistance(predator.x, predator.y, player.x, player.y);

  if (playerInReeds && predatorDistanceToPlayer > REEDS_DETECTION_RADIUS) {
    if (predator.lastKnownPlayerX !== null && predator.lastKnownPlayerY !== null) {
      targetX = predator.lastKnownPlayerX;
      targetY = predator.lastKnownPlayerY;
      usingLastKnownPosition = true;
    } else {
      predator.state = "search";
      return;
    }
  } else {
    predator.lastKnownPlayerX = player.x;
    predator.lastKnownPlayerY = player.y;
  }

  predator.state = usingLastKnownPosition ? "search" : pondZone.state;

  const dx = targetX - predator.x;
  const dy = targetY - predator.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.001) return;

  const dirX = dx / distance;
  const dirY = dy / distance;
  const effectiveSpeed = predator.speed * pondZone.speedMultiplier * reedsSpeedMultiplier * pacingSpeedMultiplier;
  const nextX = predator.x + dirX * effectiveSpeed * deltaTime;
  const nextY = predator.y + dirY * effectiveSpeed * deltaTime;
  const nextDistanceFromLodge = getDistanceFromPondCenter(nextX, nextY, pond);

  // Deep zone is forbidden: stop at the deep boundary rather than entering.
  if (nextDistanceFromLodge < pond.innerRadius) {
    const boundaryPosition = projectPointToPondRadius(nextX, nextY, pond, pond.innerRadius + 0.1);
    predator.x = boundaryPosition.x;
    predator.y = boundaryPosition.y;
    beginPredatorCircling();
  } else {
    predator.x = nextX;
    predator.y = nextY;
  }

  const halfSize = predator.size / 2;
  predator.x = clamp(predator.x, halfSize, canvas.width - halfSize);
  predator.y = clamp(predator.y, halfSize, canvas.height - halfSize);
}

function beginPredatorCircling() {
  predator.state = "circle";
  predator.stateTimer = getRandomRange(PREDATOR_CIRCLE_MIN_DURATION, PREDATOR_CIRCLE_MAX_DURATION);
  predator.circleDirection = Math.random() < 0.5 ? -1 : 1;
}

function updatePredatorCircleMovement(deltaTime, pond, pondSpeedMultiplier, reedsSpeedMultiplier, pacingSpeedMultiplier) {
  const circleRadius = pond.innerRadius + 0.1;
  const dx = predator.x - pond.centerX;
  const dy = predator.y - pond.centerY;
  const normalizedDx = dx / pond.xScale;
  const normalizedDy = dy / pond.yScale;
  const distance = Math.hypot(normalizedDx, normalizedDy);

  if (distance <= 0.0001) {
    const safePosition = projectPointToPondRadius(predator.x, predator.y, pond, circleRadius);
    predator.x = safePosition.x;
    predator.y = safePosition.y;
    predator.stateTimer -= deltaTime;
    if (predator.stateTimer <= 0) predator.state = "normal";
    return;
  }

  const radialX = normalizedDx / distance;
  const radialY = normalizedDy / distance;
  const tangentX = -radialY * pond.xScale * predator.circleDirection;
  const tangentY = radialX * pond.yScale * predator.circleDirection;
  const tangentLength = Math.hypot(tangentX, tangentY);

  const dirX = tangentLength > 0 ? tangentX / tangentLength : 0;
  const dirY = tangentLength > 0 ? tangentY / tangentLength : 0;
  const effectiveSpeed = predator.speed * pondSpeedMultiplier * reedsSpeedMultiplier * pacingSpeedMultiplier;

  const movedX = predator.x + dirX * effectiveSpeed * deltaTime;
  const movedY = predator.y + dirY * effectiveSpeed * deltaTime;
  const boundaryPosition = projectPointToPondRadius(movedX, movedY, pond, circleRadius);

  predator.x = boundaryPosition.x;
  predator.y = boundaryPosition.y;

  const halfSize = predator.size / 2;
  predator.x = clamp(predator.x, halfSize, canvas.width - halfSize);
  predator.y = clamp(predator.y, halfSize, canvas.height - halfSize);

  if (getDistanceFromPondCenter(predator.x, predator.y, pond) < pond.innerRadius) {
    const safePosition = projectPointToPondRadius(predator.x, predator.y, pond, circleRadius);
    predator.x = safePosition.x;
    predator.y = safePosition.y;
  }

  predator.stateTimer -= deltaTime;
  if (predator.stateTimer <= 0) {
    predator.state = "normal";
    predator.stateTimer = 0;
  }
}

function getRandomRange(min, max) {
  return min + Math.random() * (max - min);
}

function getPredatorSpeedMultiplier(currentRunTime) {
  // Simple time-based pressure scaling for early/mid/late pacing.
  if (currentRunTime < 25) return 1.0;
  if (currentRunTime < 55) return 1.08;
  return 1.16;
}

function getPredatorPondZone() {
  const pond = getPondGeometry();
  const distanceFromLodge = getDistanceFromPondCenter(predator.x, predator.y, pond);

  if (distanceFromLodge <= pond.innerRadius) {
    return { state: "blocked", speedMultiplier: 0 };
  }

  if (distanceFromLodge <= pond.middleRadius) {
    return { state: "medium", speedMultiplier: 0.55 };
  }

  if (distanceFromLodge <= pond.outerRadius) {
    return { state: "shallow", speedMultiplier: 0.75 };
  }

  return { state: "normal", speedMultiplier: 1 };
}

function getDistanceFromPondCenter(x, y, pond) {
  const dx = (x - pond.centerX) / pond.xScale;
  const dy = (y - pond.centerY) / pond.yScale;
  return Math.hypot(dx, dy);
}

function projectPointToPondRadius(px, py, pond, radius) {
  const dx = px - pond.centerX;
  const dy = py - pond.centerY;
  const normalizedDx = dx / pond.xScale;
  const normalizedDy = dy / pond.yScale;
  const distance = Math.hypot(normalizedDx, normalizedDy);

  if (distance <= 0.0001) {
    return { x: pond.centerX + radius * pond.xScale, y: pond.centerY };
  }

  const scale = radius / distance;
  return { x: pond.centerX + dx * scale, y: pond.centerY + dy * scale };
}

function getPredatorColor() {
  if (predator.state === "idle") return "#9ca3af";
  if (predator.state === "circle") return "#b65c2f";
  if (predator.state === "search") return "#8b5a2b";
  if (predator.state === "blocked") return "#6b7280";
  if (predator.state === "medium") return "#1f7a8f";
  if (predator.state === "shallow") return "#d97706";
  return predator.color;
}

function checkGameOver() {
  const reachDistance = (player.size + predator.size) / 2;
  const predatorDistance = getDistance(player.x, player.y, predator.x, predator.y);

  if (predatorDistance <= reachDistance) {
    saveFinalStats();
    triggerHitFeedback();
    gameOver = true;
  }
}

function triggerHitFeedback() {
  screenShakeTimer = HIT_SHAKE_DURATION;
  screenShakeStrength = 7;
  playHitSound();
}

function updateWinCondition(deltaTime) {
  if (gameOver) return;

  if (pondStability >= 100) {
    saveFinalStats();
    hasWon = true;
  }
}

function saveFinalStats() {
  finalStats.timeSurvived = runTime;
  finalStats.pondSize = getPondGeometry().outerRadius;
}

function restartGame() {
  player.x = INITIAL_PLAYER_X;
  player.y = INITIAL_PLAYER_Y;

  predator.x = INITIAL_PREDATOR_X;
  predator.y = INITIAL_PREDATOR_Y;
  predator.state = "normal";
  predator.lastKnownPlayerX = null;
  predator.lastKnownPlayerY = null;
  predator.stateTimer = 0;
  predator.circleDirection = 1;

  resources.wood = 0;
  resources.trees = createTrees();
  resources.damTiles = [];

  waterLevel = 0;
  targetWaterLevel = 0;
  gameOver = false;
  hasWon = false;
  winHoldDuration = 0;
  predatorAwarenessTimer = 0;
  damPlacementEffects = [];
  screenShakeTimer = 0;
  player.pickupPulseTimer = 0;
  runTime = 0;
  pondStability = 0;
  gameStarted = false;
  gamePhase = PHASE_INTRO;
  introAnimTime = 0;
  finalStats = { timeSurvived: 0, pondSize: 0 };
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


function ensureAudioStarted() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = new AudioCtor();
    startAmbientWaterAudio();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function initializeAmbientAudioOnStart() {
  ensureAudioStarted();

  // Retry quietly so ambient starts once the context is available.
  if (ambientRetryIntervalId) return;
  ambientRetryIntervalId = setInterval(() => {
    ensureAudioStarted();
    if (audioContext && audioContext.state === "running" && ambientWaterGain) {
      clearInterval(ambientRetryIntervalId);
      ambientRetryIntervalId = null;
    }
  }, 1000);
}

function startAmbientWaterAudio() {
  if (!audioContext || ambientWaterGain) return;

  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    // Gentle correlated noise for a small stream feel.
    const white = (Math.random() * 2 - 1) * 0.06;
    last = last * 0.82 + white;
    data[i] = last;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const highPass = audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 360;
  highPass.Q.value = 0.6;

  const bandPass = audioContext.createBiquadFilter();
  bandPass.type = "bandpass";
  bandPass.frequency.value = 1650;
  bandPass.Q.value = 0.75;

  ambientWaterGain = audioContext.createGain();
  ambientWaterGain.gain.value = 0.07;

  source.connect(highPass);
  highPass.connect(bandPass);
  bandPass.connect(ambientWaterGain);
  ambientWaterGain.connect(audioContext.destination);
  source.start();
  console.log("[audio] ambient water loop started");
}

function playPickupSound() {
  if (!audioContext) return;
  playTone({
    type: "triangle",
    startFreq: 720,
    endFreq: 940,
    duration: 0.09,
    volume: 0.055,
  });
}

function playDamPlacementSound() {
  if (!audioContext) return;
  playTone({
    type: "square",
    startFreq: 230,
    endFreq: 170,
    duration: 0.08,
    volume: 0.045,
  });
}

function playHitSound() {
  if (!audioContext) return;
  playTone({
    type: "sawtooth",
    startFreq: 220,
    endFreq: 90,
    duration: 0.14,
    volume: 0.08,
  });
}

function playTone({ type, startFreq, endFreq, duration, volume }) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

initializeAmbientAudioOnStart();
requestAnimationFrame(gameLoop);
