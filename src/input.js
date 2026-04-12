import {
  PHASE_INTRO,
  PHASE_INSTRUCTIONS,
  PHASE_PLAYING,
  YEAR_PHASE_AUTUMN,
  YEAR_PHASE_GROWTH,
  YEAR_PHASE_WINTER,
} from "./config.js";

export function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    gatherRequested: false,
    buildRequested: false,
    stockpileRequested: false,
  };
}

export function clearInputState(input) {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.gatherRequested = false;
  input.buildRequested = false;
  input.stockpileRequested = false;
}

function setDirectionKey(input, key, isPressed) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "w" || normalizedKey === "arrowup") input.up = isPressed;
  if (normalizedKey === "s" || normalizedKey === "arrowdown") input.down = isPressed;
  if (normalizedKey === "a" || normalizedKey === "arrowleft") input.left = isPressed;
  if (normalizedKey === "d" || normalizedKey === "arrowright") input.right = isPressed;
}

export function setupInput(state, actions) {
  window.addEventListener("keydown", (event) => {
    const normalizedKey = event.key.toLowerCase();

    if (normalizedKey === "m" && event.repeat === false) {
      console.log("[audio] manual ambient trigger");
      actions.ensureAudioStarted();
    }

    if (normalizedKey === "r" && state.gameOver && event.repeat === false) {
      actions.restartGame();
      return;
    }

    if (state.gamePhase === PHASE_INTRO && event.repeat === false) {
      state.gamePhase = PHASE_INSTRUCTIONS;
      return;
    }

    if (state.gamePhase === PHASE_INSTRUCTIONS && event.repeat === false) {
      actions.startGame();
      return;
    }

    if (state.gamePhase === PHASE_PLAYING) {
      if (
        state.season &&
        state.season.transitionCard.active &&
        state.season.transitionCard.requiresInput &&
        event.repeat === false
      ) {
        state.season.transitionCard.active = false;
        state.season.transitionCard.timer = 0;
        return;
      }

      if (state.season.phase === YEAR_PHASE_WINTER) {
        if (event.repeat === false) {
          if (normalizedKey === "1") actions.submitWinterChoice(0);
          if (normalizedKey === "2") actions.submitWinterChoice(1);
          if (normalizedKey === "3") actions.submitWinterChoice(2);
        }
        return;
      }

      if (normalizedKey === "e" && event.repeat === false) {
        state.input.gatherRequested = true;
      }

      if ((normalizedKey === "b" || normalizedKey === " ") && event.repeat === false) {
        state.input.buildRequested = true;
      }

      if (normalizedKey === "f" && event.repeat === false) {
        state.input.stockpileRequested = true;
      }

      setDirectionKey(state.input, event.key, true);
    }
  });

  window.addEventListener("keyup", (event) => {
    const canMove =
      state.gamePhase === PHASE_PLAYING &&
      (state.season.phase === YEAR_PHASE_GROWTH || state.season.phase === YEAR_PHASE_AUTUMN);

    if (canMove) {
      setDirectionKey(state.input, event.key, false);
    }
  });
}
