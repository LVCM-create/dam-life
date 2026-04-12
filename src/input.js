import { PHASE_INTRO, PHASE_INSTRUCTIONS, PHASE_PLAYING } from "./config.js";

export function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    gatherRequested: false,
    buildRequested: false,
  };
}

export function clearInputState(input) {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.gatherRequested = false;
  input.buildRequested = false;
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

    if (normalizedKey === "e" && event.repeat === false) {
      if (state.gamePhase === PHASE_PLAYING) state.input.gatherRequested = true;
    }

    if ((normalizedKey === "b" || normalizedKey === " ") && event.repeat === false) {
      if (state.gamePhase === PHASE_PLAYING) state.input.buildRequested = true;
    }

    if (normalizedKey === "m" && event.repeat === false) {
      console.log("[audio] manual ambient trigger");
      actions.ensureAudioStarted();
    }

    if (normalizedKey === "r" && (state.gameOver || state.hasWon) && event.repeat === false) {
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
      setDirectionKey(state.input, event.key, true);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (state.gamePhase === PHASE_PLAYING) {
      setDirectionKey(state.input, event.key, false);
    }
  });
}
