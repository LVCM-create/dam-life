import { createPlayer } from "./player.js";
import { createPredator } from "./predator.js";
import { createTerrainState } from "./terrain.js";
import {
  INITIAL_PLAYER_OFFSET,
  INITIAL_PREDATOR_OFFSETS,
  PHASE_INTRO,
  PHASE_PLAYING,
  RESTART_FINAL_STATS,
} from "./config.js";
import { createInputState, clearInputState } from "./input.js";
import { createResourceState, createTrees } from "./systems/resourceSystem.js";
import { initializeSeason } from "./systems/seasonSystem.js";
import { initializeHunger } from "./systems/hungerSystem.js";

export function createGameState(canvas, ctx) {
  const homeX = canvas.width / 2;
  const homeY = canvas.height / 2;

  const state = {
    canvas,
    ctx,
    world: {
      HOME_X: homeX,
      HOME_Y: homeY,
      INITIAL_PLAYER_X: homeX + INITIAL_PLAYER_OFFSET.x,
      INITIAL_PLAYER_Y: homeY + INITIAL_PLAYER_OFFSET.y,
      INITIAL_PREDATOR_X: canvas.width + INITIAL_PREDATOR_OFFSETS.x,
      INITIAL_PREDATOR_Y: INITIAL_PREDATOR_OFFSETS.y,
    },

    input: createInputState(),
    player: createPlayer(homeX + INITIAL_PLAYER_OFFSET.x, homeY + INITIAL_PLAYER_OFFSET.y),
    predator: createPredator(canvas.width + INITIAL_PREDATOR_OFFSETS.x, INITIAL_PREDATOR_OFFSETS.y),
    resources: createResourceState(),
    terrainState: createTerrainState(),

    waterLevel: 0,
    targetWaterLevel: 0,
    gameOver: false,
    predatorAwarenessTimer: 0,
    invalidBuildFeedbackTimer: 0,
    invalidBuildFeedback: { x: 0, y: 0, size: 24 },
    damPlacementEffects: [],
    stockpileEffects: [],
    screenShakeTimer: 0,
    screenShakeStrength: 0,
    runTime: 0,
    gameStarted: false,
    gamePhase: PHASE_INTRO,
    introAnimTime: 0,
    finalStats: { ...RESTART_FINAL_STATS },

    year: 1,
    foodStockpile: 0,
    maxWaterBonus: 0,
    expansionLevel: 0,

    winter: {
      active: false,
      stepsRemaining: 0,
      currentEvent: null,
      pendingChoice: null,
      lastOutcome: "",
    },

    audioContext: null,
    ambientWaterGain: null,
    ambientRetryIntervalId: null,

    lastTime: performance.now(),
  };

  initializeSeason(state);
  initializeHunger(state);

  return state;
}

export function startGame(state) {
  state.gamePhase = PHASE_PLAYING;
  state.gameStarted = true;
  state.predatorAwarenessTimer = 0;
}

export function restartGameState(state) {
  state.player.x = state.world.INITIAL_PLAYER_X;
  state.player.y = state.world.INITIAL_PLAYER_Y;

  state.predator.x = state.world.INITIAL_PREDATOR_X;
  state.predator.y = state.world.INITIAL_PREDATOR_Y;
  state.predator.state = "normal";
  state.predator.lastKnownPlayerX = null;
  state.predator.lastKnownPlayerY = null;
  state.predator.stateTimer = 0;
  state.predator.circleDirection = 1;

  state.resources.wood = 0;
  state.resources.trees = createTrees();
  state.resources.damTiles = [];

  state.waterLevel = 0;
  state.targetWaterLevel = 0;
  state.gameOver = false;
  state.predatorAwarenessTimer = 0;
  state.damPlacementEffects = [];
  state.stockpileEffects = [];
  state.invalidBuildFeedbackTimer = 0;
  state.screenShakeTimer = 0;
  state.player.pickupPulseTimer = 0;
  state.runTime = 0;
  state.gameStarted = false;
  state.gamePhase = PHASE_INTRO;
  state.introAnimTime = 0;
  state.finalStats = { ...RESTART_FINAL_STATS };

  state.year = 1;
  state.foodStockpile = 0;
  state.maxWaterBonus = 0;
  state.expansionLevel = 0;

  state.winter.active = false;
  state.winter.stepsRemaining = 0;
  state.winter.currentEvent = null;
  state.winter.pendingChoice = null;
  state.winter.lastOutcome = "";

  initializeSeason(state);
  initializeHunger(state);

  clearInputState(state.input);
  state.lastTime = performance.now();
}
