import { PHASE_INTRO, PHASE_PLAYING } from "../config.js";
import { updatePlayer } from "../systems/playerSystem.js";
import { updateWaterLevel, getPondGeometry } from "../systems/pondSystem.js";
import { updatePredator, checkGameOver, saveFinalStats } from "../systems/predatorSystem.js";
import { handleResourceActions, updateFeedbackEffects, triggerHitFeedback } from "../systems/resourceSystem.js";
import { checkHungerDeath, updateHunger } from "../systems/hungerSystem.js";
import { isRealtimeSeason, updateSeason } from "../systems/seasonSystem.js";
import { updateWinterMode } from "../systems/winterEventSystem.js";

export function updateGame(state, deltaTime, audio) {
  if (state.gamePhase === PHASE_PLAYING) {
    updateFeedbackEffects(state, deltaTime);
  }

  updatePresentationState(state, deltaTime);

  if (state.gameOver) return;
  if (state.gamePhase !== PHASE_PLAYING) return;

  updateSeason(state, deltaTime);
  if (state.gameOver) {
    const cause = state.finalStats.cause || "hunger";
    saveFinalStats(state, getPondGeometry, cause);
    return;
  }
  if (state.season.transitionCard.active && state.season.transitionCard.pauseGameplay) return;

  if (isRealtimeSeason(state)) {
    updatePlayer(state, deltaTime);
    handleResourceActions(state, audio);
    updateHunger(state, deltaTime);
    updatePredator(state, deltaTime);
    checkGameOver(state, () => triggerHitFeedback(state, audio));
    updateWaterLevel(state, deltaTime);
  } else {
    updateWinterMode(state, deltaTime);
  }

  checkHungerDeath(state);
  updateSlowStartRecovery(state);
  if (state.gameOver) {
    const cause = state.finalStats.cause || "hunger";
    saveFinalStats(state, getPondGeometry, cause);
  }
}

function updateSlowStartRecovery(state) {
  if (state.player.slowStartActive && state.hunger >= state.maxHunger) {
    state.player.slowStartActive = false;
  }
}

function updatePresentationState(state, deltaTime) {
  if (state.gamePhase === PHASE_INTRO) {
    state.introAnimTime += deltaTime;
  }

  if (state.gamePhase === PHASE_PLAYING && state.gameOver === false) {
    if (
      state.season &&
      state.season.phase !== "winter" &&
      (state.season.transitionCard.active === false || state.season.transitionCard.pauseGameplay === false)
    ) {
      state.runTime += deltaTime;
    }
  }
}
