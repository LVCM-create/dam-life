import { PHASE_INTRO, PHASE_INSTRUCTIONS } from "../config.js";
import { drawPlayer } from "../player.js";
import { drawPredator } from "../predator.js";
import {
  drawTerrain,
  drawTrees,
  drawDamTiles,
  drawDamPlacementEffects,
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
  drawWinMessage,
} from "../ui/overlays.js";

export function renderGame(state) {
  const ctx = state.ctx;
  const canvas = state.canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.gamePhase === PHASE_INTRO) {
    drawIntroScreen(ctx, state);
    return;
  }

  const shake = getScreenShakeOffset(state);
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawGround(ctx, canvas);
  drawTerrain(ctx, state);
  drawStream(ctx, state);
  drawWaterOverlay(ctx, state);
  drawLodge(ctx, state);
  drawDamTiles(ctx, state);
  drawDamPlacementEffects(ctx, state);
  drawInvalidBuildFeedback(ctx, state);
  drawTrees(ctx, state);
  drawPlayer(ctx, state.player, getQuickPulseScale, WOOD_PICKUP_PULSE_DURATION);
  drawPredator(ctx, state.predator, getPredatorColor(state));

  ctx.restore();

  drawHud(ctx, state);

  if (state.gamePhase === PHASE_INSTRUCTIONS) {
    drawInstructionOverlay(ctx, state);
  }

  if (state.gameOver) {
    drawGameOverMessage(ctx, state);
  } else if (state.hasWon) {
    drawWinMessage(ctx, state);
  }
}

function drawGround(ctx, canvas) {
  ctx.fillStyle = "#9dd7ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
