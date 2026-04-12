import { createGameState, startGame, restartGameState } from "./state.js";
import { setupInput } from "./input.js";
import { createAudioSystem } from "./audio/audioSystem.js";
import { updateGame } from "./core/updateGame.js";
import { renderGame } from "./core/renderGame.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const state = createGameState(canvas, ctx);
const audio = createAudioSystem(state);

setupInput(state, {
  ensureAudioStarted: audio.ensureAudioStarted,
  startGame: () => startGame(state),
  restartGame: () => restartGameState(state),
});

audio.initializeAmbientAudioOnStart();
requestAnimationFrame(gameLoop);

function gameLoop(timestamp) {
  const deltaTime = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;

  updateGame(state, deltaTime, audio);
  renderGame(state);

  requestAnimationFrame(gameLoop);
}
