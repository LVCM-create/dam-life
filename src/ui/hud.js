import { clamp } from "../utils/math.js";
import { getPhaseLabel } from "../systems/seasonSystem.js";

export function drawHud(ctx, state) {
  const stripX = 8;
  const stripY = 8;
  const stripWidth = state.canvas.width - 16;
  const stripHeight = 34;
  const centerY = stripY + stripHeight / 2;

  ctx.fillStyle = "rgba(245, 250, 255, 0.72)";
  ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
  ctx.strokeStyle = "rgba(31, 69, 88, 0.65)";
  ctx.lineWidth = 1;
  ctx.strokeRect(stripX, stripY, stripWidth, stripHeight);

  const woodX = 18;
  const hungerLabelX = 126;
  const hungerBarX = 184;
  const hungerBarWidth = 132;
  const hungerBarHeight = 8;
  const stockpileX = 336;
  const phaseYearX = 468;

  drawWoodDisplay(ctx, woodX, centerY, state.resources.wood);

  ctx.fillStyle = "#163426";
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Hunger", hungerLabelX, centerY);
  drawBar(
    ctx,
    hungerBarX,
    centerY - hungerBarHeight / 2,
    hungerBarWidth,
    hungerBarHeight,
    state.hunger / state.maxHunger,
    "rgba(198, 92, 65, 0.9)"
  );

  ctx.fillStyle = "#163426";
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.fillText("Stockpile: " + state.foodStockpile, stockpileX, centerY);
  ctx.fillText(getPhaseLabel(state) + " - Year " + state.year, phaseYearX, centerY);

  if (state.player.slowStartActive) {
    ctx.fillStyle = "rgba(167, 48, 48, 0.95)";
    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    ctx.fillText("Weak: Slow Start", 654, centerY);
  }
}

function drawWoodDisplay(ctx, x, centerY, woodCount) {
  const iconWidth = 28;
  const iconHeight = 12;
  const iconY = centerY - iconHeight / 2;

  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(x, iconY, iconWidth, iconHeight);
  ctx.strokeStyle = "#4f3723";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, iconY, iconWidth, iconHeight);

  ctx.fillStyle = "#9e7a56";
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, centerY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e432c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, centerY, 4.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#163426";
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("x" + woodCount, x + iconWidth + 8, centerY);
}

function drawBar(ctx, x, y, width, height, fillRatio, color) {
  const ratio = clamp(fillRatio, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(35, 71, 84, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * ratio, height);
}
