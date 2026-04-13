import { DRIFT_WATER_RETAIN, EXPANSION_MAX_WATER_BONUS } from "../config.js";
import { createTrees } from "./resourceSystem.js";

export function applyYearEndTransition(state) {
  const cadence = getYearCadence(state.year);
  let driftBrokenTiles = [];
  let expansionApplied = false;

  if (cadence === "drift") {
    state.waterLevel *= DRIFT_WATER_RETAIN;
    state.targetWaterLevel *= DRIFT_WATER_RETAIN;
    const driftDamage = applyClusterDamDamageByRatio(state.resources.damTiles, 0.32);
    state.resources.damTiles = driftDamage.remainingTiles;
    driftBrokenTiles = driftDamage.brokenTiles;
    state.resources.trees = reshuffleTrees(createTrees());
  } else {
    state.expansionLevel += 1;
    state.maxWaterBonus = Math.min(EXPANSION_MAX_WATER_BONUS, state.maxWaterBonus + 8);
    expansionApplied = true;
  }

  state.year += 1;
  return { cadence, driftBrokenTiles, expansionApplied };
}

export function getYearCadence(yearNumber) {
  if (yearNumber < 3) return "drift";
  const step = (yearNumber - 3) % 3;
  if (step === 0) return "expansion";
  return "drift";
}

export function applyClusterDamDamageByCount(damTiles, requestedRemovalCount, minRemain = 2) {
  if (damTiles.length <= minRemain || requestedRemovalCount <= 0) {
    return { remainingTiles: damTiles, brokenTiles: [] };
  }

  const maxRemovalCount = Math.max(0, damTiles.length - minRemain);
  const removalCount = Math.min(requestedRemovalCount, maxRemovalCount);
  if (removalCount <= 0) {
    return { remainingTiles: damTiles, brokenTiles: [] };
  }

  const keepIndices = new Set(damTiles.map((_, i) => i));
  const removedIndices = new Set();
  const clusterCount = Math.min(4, Math.max(1, Math.ceil(removalCount / 3)));
  const clusterCenters = [];

  for (let i = 0; i < clusterCount; i += 1) {
    const index = getRandomRemainingIndex(keepIndices);
    if (index === null) break;
    clusterCenters.push({ x: damTiles[index].x, y: damTiles[index].y });
  }

  for (let i = 0; i < removalCount; i += 1) {
    if (keepIndices.size <= minRemain) break;
    const center = clusterCenters[i % clusterCenters.length];
    const indexToRemove = getNearestTileIndex(damTiles, keepIndices, center);
    if (indexToRemove === null) break;

    keepIndices.delete(indexToRemove);
    removedIndices.add(indexToRemove);

    if (Math.random() < 0.35) {
      const tile = damTiles[indexToRemove];
      center.x = tile.x;
      center.y = tile.y;
    }
  }

  const brokenTiles = damTiles.filter((_, index) => removedIndices.has(index));
  const remainingTiles = damTiles.filter((_, index) => removedIndices.has(index) === false);
  return { remainingTiles, brokenTiles };
}

function reshuffleTrees(trees) {
  return trees.map((tree) => {
    const jitterX = (Math.random() * 40) - 20;
    const jitterY = (Math.random() * 40) - 20;
    return {
      ...tree,
      x: Math.max(40, Math.min(760, tree.x + jitterX)),
      y: Math.max(40, Math.min(460, tree.y + jitterY)),
    };
  });
}

function applyClusterDamDamageByRatio(damTiles, removalRatio) {
  const requestedRemovalCount = Math.max(1, Math.round(damTiles.length * removalRatio));
  return applyClusterDamDamageByCount(damTiles, requestedRemovalCount, 2);
}

function getRandomRemainingIndex(remainingIndexSet) {
  const entries = Array.from(remainingIndexSet);
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}

function getNearestTileIndex(damTiles, remainingIndexSet, center) {
  let bestIndex = null;
  let bestScore = Infinity;

  for (const index of remainingIndexSet) {
    const tile = damTiles[index];
    const dx = tile.x - center.x;
    const dy = tile.y - center.y;
    const distance = Math.hypot(dx, dy);
    const score = distance + Math.random() * 12;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}
