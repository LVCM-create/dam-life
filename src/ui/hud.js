import { clamp } from "../utils/math.js";

export function drawHud(ctx, state) {
  const hudY = 18;
  const leftMargin = 26;
  const rightMargin = 26;

  const woodSectionX = leftMargin;
  const progressTextX = 230;
  const progressBarX = 430;

  drawWoodDisplay(ctx, woodSectionX, hudY, state.resources.wood);

  const progressLabel = "Progress: " + Math.round(state.pondStability) + "%";
  ctx.fillStyle = "#163426";
  ctx.font = "bold 19px Helvetica, Arial, sans-serif";
  ctx.fillText(progressLabel, progressTextX, hudY + 20);

  const progressBarWidth = Math.max(120, state.canvas.width - progressBarX - rightMargin);
  drawStabilityBar(ctx, progressBarX, hudY + 10, progressBarWidth, 10, state.pondStability / 100);
}

function drawWoodDisplay(ctx, x, y, woodCount) {
  const iconWidth = 34;
  const iconHeight = 14;
  const iconY = y + 6;

  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(x, iconY, iconWidth, iconHeight);
  ctx.strokeStyle = "#4f3723";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, iconY, iconWidth, iconHeight);

  ctx.fillStyle = "#9e7a56";
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, iconY + iconHeight / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5e432c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + iconWidth - 2, iconY + iconHeight / 2, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#163426";
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  ctx.fillText("x" + woodCount, x + iconWidth + 16, y + 20);
}

function drawStabilityBar(ctx, x, y, width, height, fillRatio) {
  const ratio = clamp(fillRatio, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(35, 71, 84, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "rgba(45, 134, 211, 0.9)";
  ctx.fillRect(x, y, width * ratio, height);
}
