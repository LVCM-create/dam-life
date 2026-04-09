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

function setDirectionKey(input, key, isPressed) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "w" || normalizedKey === "arrowup") input.up = isPressed;
  if (normalizedKey === "s" || normalizedKey === "arrowdown") input.down = isPressed;
  if (normalizedKey === "a" || normalizedKey === "arrowleft") input.left = isPressed;
  if (normalizedKey === "d" || normalizedKey === "arrowright") input.right = isPressed;
}

export function setupInputListeners(input, getGameState) {
  window.addEventListener("keydown", (event) => {
    const normalizedKey = event.key.toLowerCase();
    const { gamePhase, gameOver, hasWon, restartGame, ensureAudioStarted } = getGameState();

    if (normalizedKey === "e" && !event.repeat) {
      if (gamePhase === "playing") input.gatherRequested = true;
    }

    if ((normalizedKey === "b" || normalizedKey === " ") && !event.repeat) {
      if (gamePhase === "playing") input.buildRequested = true;
    }

    if (normalizedKey === "m" && !event.repeat) {
      ensureAudioStarted();
    }

    if (normalizedKey === "r" && (gameOver || hasWon) && !event.repeat) {
      restartGame();
      return;
    }

    if (gamePhase === "intro" && !event.repeat) {
      getGameState().setPhase("instructions");
      return;
    }

    if (gamePhase === "instructions" && !event.repeat) {
      getGameState().startGame();
      return;
    }

    if (gamePhase !== "playing") return;

    setDirectionKey(input, event.key, true);
  });

  window.addEventListener("keyup", (event) => {
    if (getGameState().gamePhase !== "playing") return;
    setDirectionKey(input, event.key, false);
  });
}