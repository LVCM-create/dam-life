import { HUNGER_DRAIN_AUTUMN, HUNGER_DRAIN_GROWTH, HUNGER_MAX, YEAR_PHASE_AUTUMN } from "../config.js";
import { clamp } from "../utils/math.js";

export function updateHunger(state, deltaTime) {
  const drainRate = state.season.phase === YEAR_PHASE_AUTUMN ? HUNGER_DRAIN_AUTUMN : HUNGER_DRAIN_GROWTH;
  state.hunger = clamp(state.hunger - drainRate * deltaTime, 0, state.maxHunger);
}

export function restoreHunger(state, amount) {
  state.hunger = clamp(state.hunger + amount, 0, state.maxHunger);
}

export function initializeHunger(state) {
  state.maxHunger = HUNGER_MAX;
  state.hunger = HUNGER_MAX;
}

export function checkHungerDeath(state) {
  if (state.gameOver === false && state.hunger <= 0) {
    state.finalStats.cause = "hunger";
    state.gameOver = true;
  }
}
