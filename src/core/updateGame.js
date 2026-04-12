import { PHASE_INTRO, PHASE_PLAYING } from "../config.js";
import { updatePlayer } from "../systems/playerSystem.js";
import { updateWaterLevel, getPondStabilityPercent, getPondGeometry } from "../systems/pondSystem.js";
import { updatePredator, checkGameOver, updateWinCondition } from "../systems/predatorSystem.js";
import { handleResourceActions, updateFeedbackEffects, triggerHitFeedback } from "../systems/resourceSystem.js";

export function updateGame(state, deltaTime, audio) {
  if (state.gamePhase === PHASE_PLAYING) {
    updateFeedbackEffects(state, deltaTime);
  }

  updatePresentationState(state, deltaTime);

  if (state.gameOver || state.hasWon) return;
  if (state.gamePhase !== PHASE_PLAYING) return;

  updatePlayer(state, deltaTime);
  handleResourceActions(state, audio);
  updatePredator(state, deltaTime);

  checkGameOver(state, () => triggerHitFeedback(state, audio));
  updateWinCondition(state, getPondGeometry);
  updateWaterLevel(state, deltaTime);
}

function updatePresentationState(state, deltaTime) {
  if (state.gamePhase === PHASE_INTRO) {
    state.introAnimTime += deltaTime;
  }

  if (state.gamePhase === PHASE_PLAYING && state.gameOver === false && state.hasWon === false) {
    state.runTime += deltaTime;
  }

  state.pondStability = getPondStabilityPercent(state);
}
