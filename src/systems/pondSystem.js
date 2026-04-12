import { clamp, moveTowards } from "../utils/math.js";
import { WIN_REQUIRED_POND_RADIUS } from "../config.js";
import { getTotalDamStrength, getPrimeDamBand } from "../dam.js";

export function updateWaterLevel(state, deltaTime) {
  state.targetWaterLevel = getTargetWaterLevel(state);
  const waterRiseSpeed = 25;
  state.waterLevel = moveTowards(state.waterLevel, state.targetWaterLevel, waterRiseSpeed * deltaTime);
}

export function getTargetWaterLevel(state) {
  const waterPerDamStrength = 10;
  const totalDamStrength = getTotalDamStrength(state.resources.damTiles);
  const unclampedTarget = totalDamStrength * waterPerDamStrength;
  return clamp(unclampedTarget, 0, getMaxWaterLevel());
}

export function getMaxWaterLevel() {
  return 100;
}

export function getPondGeometry(state) {
  const waterRatio = clamp(state.waterLevel / getMaxWaterLevel(), 0, 1);
  const baseRadius = 95;
  const outerRadius = baseRadius + waterRatio * 190;

  return {
    centerX: state.world.HOME_X,
    centerY: state.world.HOME_Y,
    xScale: 1.16,
    yScale: 0.68,
    outerRadius,
    middleRadius: outerRadius * 0.68,
    innerRadius: outerRadius * 0.4,
  };
}

export function getPondStabilityPercent(state) {
  const pond = getPondGeometry(state);
  return clamp((pond.outerRadius / WIN_REQUIRED_POND_RADIUS) * 100, 0, 100);
}

export function getStreamGeometry(state) {
  return {
    startX: 0,
    endX: state.world.HOME_X + 52,
    centerY: state.world.HOME_Y - 8,
    leftHeight: 86,
    rightHeight: 132,
  };
}

export function isPointInStream(x, y, state) {
  const stream = getStreamGeometry(state);
  if (x < stream.startX || x > stream.endX) return false;

  const t = (x - stream.startX) / (stream.endX - stream.startX);
  const heightAtX = stream.leftHeight + (stream.rightHeight - stream.leftHeight) * t;
  const halfHeight = heightAtX / 2;

  return y >= stream.centerY - halfHeight && y <= stream.centerY + halfHeight;
}

export function getDistanceFromPondCenter(x, y, pond) {
  const dx = (x - pond.centerX) / pond.xScale;
  const dy = (y - pond.centerY) / pond.yScale;
  return Math.hypot(dx, dy);
}

export function projectPointToPondRadius(px, py, pond, radius) {
  const dx = px - pond.centerX;
  const dy = py - pond.centerY;
  const normalizedDx = dx / pond.xScale;
  const normalizedDy = dy / pond.yScale;
  const distance = Math.hypot(normalizedDx, normalizedDy);

  if (distance <= 0.0001) {
    return { x: pond.centerX + radius * pond.xScale, y: pond.centerY };
  }

  const scale = radius / distance;
  return { x: pond.centerX + dx * scale, y: pond.centerY + dy * scale };
}

export function drawStream(ctx, state) {
  const stream = getStreamGeometry(state);
  drawStreamBand(ctx, stream, "rgba(128, 200, 248, 0.55)");
  drawStreamBand(
    ctx,
    {
      ...stream,
      leftHeight: stream.leftHeight * 0.52,
      rightHeight: stream.rightHeight * 0.52,
    },
    "rgba(64, 153, 222, 0.55)"
  );
  drawPrimeDamBand(ctx, stream);

  ctx.strokeStyle = "rgba(44, 114, 171, 0.85)";
  ctx.lineWidth = 2;
  drawStreamPath(ctx, stream);
  ctx.stroke();
}

export function drawWaterOverlay(ctx, state) {
  const pond = getPondGeometry(state);

  ctx.save();
  ctx.translate(pond.centerX, pond.centerY);
  ctx.scale(pond.xScale, pond.yScale);

  drawPondZone(ctx, pond.outerRadius, "rgba(126, 196, 244, 0.6)");
  drawPondZone(ctx, pond.middleRadius, "rgba(61, 143, 213, 0.65)");
  drawPondZone(ctx, pond.innerRadius, "rgba(28, 90, 164, 0.72)");

  ctx.strokeStyle = "rgba(16, 71, 133, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, pond.outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPondZone(ctx, radius, color) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawStreamBand(ctx, stream, color) {
  ctx.fillStyle = color;
  drawStreamPath(ctx, stream);
  ctx.fill();
}

function drawStreamPath(ctx, stream) {
  const leftHalf = stream.leftHeight / 2;
  const rightHalf = stream.rightHeight / 2;

  ctx.beginPath();
  ctx.moveTo(stream.startX, stream.centerY - leftHalf);
  ctx.lineTo(stream.endX, stream.centerY - rightHalf);
  ctx.lineTo(stream.endX, stream.centerY + rightHalf);
  ctx.lineTo(stream.startX, stream.centerY + leftHalf);
  ctx.closePath();
}

function drawPrimeDamBand(ctx, stream) {
  const band = getPrimeDamBand(stream);
  ctx.fillStyle = "rgba(76, 196, 102, 0.22)";
  ctx.fillRect(band.x, band.y, band.width, band.height);
  ctx.strokeStyle = "rgba(49, 139, 70, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(band.x, band.y, band.width, band.height);
}
