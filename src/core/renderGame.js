import { PHASE_INTRO, PHASE_INSTRUCTIONS, YEAR_PHASE_AUTUMN, YEAR_PHASE_WINTER } from "../config.js";
import { drawPlayer } from "../player.js";
import { drawPredator } from "../predator.js";
import {
  drawTerrain,
  drawTrees,
  drawDamTiles,
  drawStockpileZone,
  drawDamPlacementEffects,
  drawStockpileFeedbackEffects,
  drawInvalidBuildFeedback,
  getScreenShakeOffset,
  getQuickPulseScale,
} from "../systems/resourceSystem.js";
import { drawStream, drawWaterOverlay } from "../systems/pondSystem.js";
import { getPredatorColor } from "../systems/predatorSystem.js";
import { WOOD_PICKUP_PULSE_DURATION } from "../config.js";
import { drawHud } from "../ui/hud.js";
import {
  drawIntroScreen,
  drawInstructionOverlay,
  drawGameOverMessage,
  drawPhaseTransitionCard,
} from "../ui/overlays.js";
import { drawWinterPanel } from "../ui/winterPanel.js";

export function renderGame(state) {
  const ctx = state.ctx;
  const canvas = state.canvas;
  const isInstructionScreen = state.gamePhase === PHASE_INSTRUCTIONS;
  const isTransitionCardVisible = state.season && state.season.transitionCard.active;
  const isWinterPanelVisible = state.season && state.season.phase === YEAR_PHASE_WINTER;
  const isMajorOverlayVisible = state.gameOver || isInstructionScreen || isTransitionCardVisible || isWinterPanelVisible;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.gamePhase === PHASE_INTRO) {
    drawIntroScreen(ctx, state);
    return;
  }

  const shake = getScreenShakeOffset(state);
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawGround(ctx, state);
  drawTerrain(ctx, state);
  drawStream(ctx, state);
  drawWaterOverlay(ctx, state);
  drawLodge(ctx, state);
  drawStockpileZone(ctx, state);
  drawDamTiles(ctx, state);
  drawDamPlacementEffects(ctx, state);
  drawStockpileFeedbackEffects(ctx, state);
  drawInvalidBuildFeedback(ctx, state);
  drawTrees(ctx, state);
  drawPlayer(ctx, state.player, getQuickPulseScale, WOOD_PICKUP_PULSE_DURATION);
  drawPredator(ctx, state.predator, getPredatorColor(state));

  ctx.restore();

  if (isMajorOverlayVisible === false) {
    drawHud(ctx, state);
  }

  if (isTransitionCardVisible && state.gameOver === false) {
    drawPhaseTransitionCard(ctx, state);
  }

  if (isWinterPanelVisible && isTransitionCardVisible === false && state.gameOver === false) {
    drawWinterPanel(ctx, state);
  }

  if (isInstructionScreen && isTransitionCardVisible === false && state.gameOver === false) {
    drawInstructionOverlay(ctx, state);
  }

  if (state.gameOver) {
    drawGameOverMessage(ctx, state);
  }
}

function drawGround(ctx, state) {
  if (state.season.phase === YEAR_PHASE_AUTUMN) {
    ctx.fillStyle = "#c9d8a0";
  } else if (state.season.phase === YEAR_PHASE_WINTER) {
    ctx.fillStyle = "#c7d8ea";
  } else {
    ctx.fillStyle = "#9dd7ff";
  }
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
}

function drawLodge(ctx, state) {
  const lodgeWidth = 44;
  const lodgeHeight = 32;
  const lodgeX = state.world.HOME_X - lodgeWidth / 2;
  const lodgeY = state.world.HOME_Y - lodgeHeight / 2;

  ctx.fillStyle = "#6c4a2a";
  ctx.fillRect(lodgeX, lodgeY, lodgeWidth, lodgeHeight);

  ctx.fillStyle = "#2a1b11";
  ctx.fillRect(state.world.HOME_X - 7, state.world.HOME_Y - 3, 14, 19);

  ctx.strokeStyle = "#3b2718";
  ctx.lineWidth = 2;
  ctx.strokeRect(lodgeX, lodgeY, lodgeWidth, lodgeHeight);
}
