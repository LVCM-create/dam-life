import { getDistance, snapToGrid } from "../utils/math.js";
import { getDamEfficiencyTier, getDamEfficiencyValue } from "../dam.js";
import {
  DAM_PULSE_DURATION,
  INVALID_BUILD_FEEDBACK_DURATION,
  WOOD_PICKUP_PULSE_DURATION,
  HIT_SHAKE_DURATION,
  HUNGER_TREE_RESTORE,
  STOCKPILE_GAIN_AUTUMN,
  STOCKPILE_GAIN_GROWTH,
  STOCKPILE_NEAR_LODGE_DISTANCE,
  STOCKPILE_WOOD_COST,
  YEAR_PHASE_AUTUMN,
} from "../config.js";
import { getStreamGeometry, isPointInStream } from "./pondSystem.js";
import { restoreHunger } from "./hungerSystem.js";

export function createResourceState() {
  return {
    wood: 0,
    trees: createTrees(),
    damTiles: [],
    damBreakMarkers: [],
  };
}

export function createTrees() {
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

export function updateFeedbackEffects(state, deltaTime) {
  state.invalidBuildFeedbackTimer = Math.max(0, state.invalidBuildFeedbackTimer - deltaTime);
  state.player.pickupPulseTimer = Math.max(0, state.player.pickupPulseTimer - deltaTime);
  state.screenShakeTimer = Math.max(0, state.screenShakeTimer - deltaTime);

  for (const effect of state.damPlacementEffects) {
    effect.timer = Math.max(0, effect.timer - deltaTime);
  }
  state.damPlacementEffects = state.damPlacementEffects.filter((effect) => effect.timer > 0);

  for (const effect of state.stockpileEffects) {
    effect.timer = Math.max(0, effect.timer - deltaTime);
  }
  state.stockpileEffects = state.stockpileEffects.filter((effect) => effect.timer > 0);

  for (const marker of state.resources.damBreakMarkers) {
    marker.timer = Math.max(0, marker.timer - deltaTime);
  }
  state.resources.damBreakMarkers = state.resources.damBreakMarkers.filter((marker) => marker.timer > 0);
}

export function handleResourceActions(state, audio) {
  if (state.input.gatherRequested) {
    tryGatherWood(state, audio);
    state.input.gatherRequested = false;
  }

  if (state.input.buildRequested) {
    tryPlaceDamTile(state, audio);
    state.input.buildRequested = false;
  }

  if (state.input.stockpileRequested) {
    tryStockpileFood(state, audio);
    state.input.stockpileRequested = false;
  }
}

export function triggerHitFeedback(state, audio) {
  state.screenShakeTimer = HIT_SHAKE_DURATION;
  state.screenShakeStrength = 7;
  audio.playHitSound();
}

export function getQuickPulseScale(timer, duration, maxBoost) {
  if (timer <= 0 || duration <= 0) return 1;
  const progress = 1 - timer / duration;

  if (progress < 0.5) {
    return 1 + maxBoost * (progress / 0.5);
  }
  return 1 + maxBoost * ((1 - progress) / 0.5);
}

export function getScreenShakeOffset(state) {
  if (state.screenShakeTimer <= 0) return { x: 0, y: 0 };
  const intensity = (state.screenShakeTimer / HIT_SHAKE_DURATION) * state.screenShakeStrength;
  return {
    x: (Math.random() * 2 - 1) * intensity,
    y: (Math.random() * 2 - 1) * intensity,
  };
}

export function drawTerrain(ctx, state) {
  drawMudZones(ctx, state.terrainState.mudZones);
  drawReedZones(ctx, state.terrainState.reedZones);
}

export function drawTrees(ctx, state) {
  for (const tree of state.resources.trees) {
    drawTree(ctx, tree);
  }
}

export function drawDamTiles(ctx, state) {
  for (const tile of state.resources.damTiles) {
    drawDamTile(ctx, tile);
  }
}

export function drawDamBreakMarkers(ctx, state) {
  for (const marker of state.resources.damBreakMarkers) {
    const alpha = 0.18 + (marker.timer / marker.duration) * 0.5;
    const radius = 8 + (1 - marker.timer / marker.duration) * 5;
    const fill = marker.type === "winter_consequence" ? "206, 58, 58" : "186, 43, 43";
    const stroke = marker.type === "winter_consequence" ? "143, 28, 28" : "120, 21, 21";
    ctx.fillStyle = `rgba(${fill}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${stroke}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function addDamBreakMarkers(state, brokenTiles, markerType = "damage") {
  const duration = markerType === "winter_consequence" ? 7.2 : 6.2;
  for (const tile of brokenTiles) {
    state.resources.damBreakMarkers.push({
      x: tile.x,
      y: tile.y,
      timer: duration,
      duration,
      type: markerType,
    });
  }
}

export function drawStockpileZone(ctx, state) {
  const zone = getStockpileZone(state);
  drawStockpileGround(ctx, zone);
  drawStockpilePile(ctx, zone, state.foodStockpile);
}

export function drawDamPlacementEffects(ctx, state) {
  for (const effect of state.damPlacementEffects) {
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

export function drawStockpileFeedbackEffects(ctx, state) {
  for (const effect of state.stockpileEffects) {
    const lifeRatio = effect.timer / DAM_PULSE_DURATION;
    const radius = effect.size * (0.45 + (1 - lifeRatio) * 0.45);
    const alpha = 0.12 + lifeRatio * 0.32;

    ctx.fillStyle = `rgba(130, 102, 70, ${alpha})`;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(78, 54, 35, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawInvalidBuildFeedback(ctx, state) {
  if (state.invalidBuildFeedbackTimer <= 0) return;

  const lifeRatio = state.invalidBuildFeedbackTimer / INVALID_BUILD_FEEDBACK_DURATION;
  const alpha = 0.25 + lifeRatio * 0.45;
  const halfSize = state.invalidBuildFeedback.size / 2;

  ctx.fillStyle = `rgba(214, 47, 47, ${alpha})`;
  ctx.fillRect(
    state.invalidBuildFeedback.x - halfSize,
    state.invalidBuildFeedback.y - halfSize,
    state.invalidBuildFeedback.size,
    state.invalidBuildFeedback.size
  );

  ctx.strokeStyle = `rgba(150, 20, 20, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    state.invalidBuildFeedback.x - halfSize,
    state.invalidBuildFeedback.y - halfSize,
    state.invalidBuildFeedback.size,
    state.invalidBuildFeedback.size
  );
}

function tryGatherWood(state, audio) {
  const gatherDistance = 48;
  const nearbyTreeIndex = state.resources.trees.findIndex((tree) => {
    const distance = getDistance(state.player.x, state.player.y, tree.x, tree.y);
    return distance <= gatherDistance;
  });

  if (nearbyTreeIndex === -1) return;

  const gatheredTree = state.resources.trees[nearbyTreeIndex];
  state.resources.wood += gatheredTree.woodValue;
  state.resources.trees.splice(nearbyTreeIndex, 1);
  state.player.pickupPulseTimer = WOOD_PICKUP_PULSE_DURATION;
  restoreHunger(state, HUNGER_TREE_RESTORE);
  audio.playPickupSound();
}

function tryStockpileFood(state, audio) {
  if (state.resources.wood < STOCKPILE_WOOD_COST) return;

  const zone = getStockpileZone(state);
  const distToZone = getDistance(state.player.x, state.player.y, zone.x, zone.y);
  if (distToZone > zone.radius + 12) return;

  const gain = state.season.phase === YEAR_PHASE_AUTUMN ? STOCKPILE_GAIN_AUTUMN : STOCKPILE_GAIN_GROWTH;
  state.resources.wood -= STOCKPILE_WOOD_COST;
  state.foodStockpile += gain;
  triggerStockpileFeedback(state, zone.x, zone.y, zone.radius * 1.4);
  audio.playDamPlacementSound();
}

function tryPlaceDamTile(state, audio) {
  const damCost = 1;
  if (state.resources.wood < damCost) return;

  const stream = getStreamGeometry(state);
  const tileSize = 24;
  const tile = {
    x: snapToGrid(state.player.x, tileSize),
    y: snapToGrid(state.player.y, tileSize),
    size: tileSize,
  };

  if (isPointInStream(tile.x, tile.y, state) === false) {
    triggerInvalidBuildFeedback(state, tile.x, tile.y, tileSize);
    return;
  }

  const alreadyPlaced = state.resources.damTiles.some((existingTile) => {
    return existingTile.x === tile.x && existingTile.y === tile.y;
  });
  if (alreadyPlaced) return;

  const efficiencyTier = getDamEfficiencyTier(tile.x, tile.y, stream);
  const efficiency = getDamEfficiencyValue(efficiencyTier);
  tile.efficiencyTier = efficiencyTier;
  tile.efficiency = efficiency;

  state.resources.wood -= damCost;
  state.resources.damTiles.push(tile);
  triggerDamPlacementFeedback(state, tile.x, tile.y, tileSize, efficiencyTier);
  audio.playDamPlacementSound();
}

function triggerInvalidBuildFeedback(state, x, y, size) {
  state.invalidBuildFeedback = { x, y, size };
  state.invalidBuildFeedbackTimer = INVALID_BUILD_FEEDBACK_DURATION;
}

function triggerDamPlacementFeedback(state, x, y, size, efficiencyTier) {
  const colors = getDamPlacementFeedbackColors(efficiencyTier);
  state.damPlacementEffects.push({
    x,
    y,
    size,
    timer: DAM_PULSE_DURATION,
    fillRgb: colors.fillRgb,
    strokeRgb: colors.strokeRgb,
  });
}

function triggerStockpileFeedback(state, x, y, size) {
  state.stockpileEffects.push({
    x,
    y,
    size,
    timer: DAM_PULSE_DURATION,
  });
}

function getDamPlacementFeedbackColors(efficiencyTier) {
  if (efficiencyTier === "prime") {
    return { fillRgb: "86, 181, 108", strokeRgb: "45, 115, 61" };
  }
  return { fillRgb: "185, 150, 91", strokeRgb: "103, 73, 42" };
}

function drawTree(ctx, tree) {
  ctx.fillStyle = "#6a3f22";
  ctx.fillRect(tree.x - 5, tree.y + 8, 10, 16);

  ctx.beginPath();
  ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2f8f3d";
  ctx.fill();
}

function drawDamTile(ctx, tile) {
  const halfSize = tile.size / 2;
  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(tile.x - halfSize, tile.y - halfSize, tile.size, tile.size);

  ctx.strokeStyle = "#4f3723";
  ctx.lineWidth = 2;
  ctx.strokeRect(tile.x - halfSize, tile.y - halfSize, tile.size, tile.size);
}

function getStockpileZone(state) {
  const distanceFromLodge = Math.min(STOCKPILE_NEAR_LODGE_DISTANCE - 6, 56);
  return {
    x: state.world.HOME_X + distanceFromLodge,
    y: state.world.HOME_Y + 20,
    radius: 22,
  };
}

function drawStockpileGround(ctx, zone) {
  ctx.fillStyle = "rgba(132, 104, 73, 0.2)";
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(83, 58, 39, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStockpilePile(ctx, zone, stockpile) {
  if (stockpile <= 0) return;

  const tier = getStockpileTier(stockpile);
  drawPileLayer(ctx, zone, tier);

  if (tier >= 2) {
    drawPileLayer(ctx, { ...zone, y: zone.y - 5 }, tier - 1);
  }
  if (tier >= 4) {
    drawPileLayer(ctx, { ...zone, y: zone.y - 10 }, 2);
  }
}

function getStockpileTier(stockpile) {
  if (stockpile < 4) return 1;
  if (stockpile < 10) return 2;
  if (stockpile < 20) return 3;
  return 4;
}

function drawPileBranch(ctx, x, y, height) {
  const width = 7;
  ctx.fillStyle = "#7f5b3b";
  ctx.fillRect(x - width / 2, y - height, width, height);
  ctx.strokeStyle = "#4f3823";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2, y - height, width, height);
}

function drawPileLayer(ctx, zone, tier) {
  const offsetsByTier = {
    1: [-8, 0, 8],
    2: [-13, -4, 5, 14],
    3: [-18, -9, 0, 9, 18],
    4: [-22, -13, -4, 5, 14, 23],
  };
  const heightByTier = {
    1: 10,
    2: 12,
    3: 14,
    4: 16,
  };

  const offsets = offsetsByTier[tier];
  const branchHeight = heightByTier[tier];
  for (const offset of offsets) {
    drawPileBranch(ctx, zone.x + offset, zone.y + 4 + Math.abs(offset) * 0.03, branchHeight);
  }
}

function drawMudZones(ctx, mudZones) {
  for (const zone of mudZones) {
    ctx.fillStyle = "rgba(122, 88, 57, 0.55)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(87, 56, 33, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
  }
}

function drawReedZones(ctx, reedZones) {
  for (const zone of reedZones) {
    ctx.fillStyle = "rgba(127, 177, 95, 0.32)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(75, 126, 58, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    drawReedBlades(ctx, zone);
  }
}

function drawReedBlades(ctx, zone) {
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
