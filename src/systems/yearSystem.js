import { DRIFT_WATER_RETAIN, EXPANSION_MAX_WATER_BONUS } from "../config.js";
import { createTrees } from "./resourceSystem.js";

export function applyYearEndTransition(state) {
  const cadence = getYearCadence(state.year);

  if (cadence === "drift") {
    state.waterLevel *= DRIFT_WATER_RETAIN;
    state.targetWaterLevel *= DRIFT_WATER_RETAIN;
    state.resources.trees = reshuffleTrees(createTrees());
  } else {
    state.expansionLevel += 1;
    state.maxWaterBonus = Math.min(EXPANSION_MAX_WATER_BONUS, state.maxWaterBonus + 4);
  }

  state.year += 1;
}

export function getYearCadence(yearNumber) {
  const step = (yearNumber - 1) % 3;
  if (step === 2) return "expansion";
  return "drift";
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
