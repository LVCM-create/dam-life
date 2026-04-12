import { moveTowards, clamp } from "../utils/math.js";
import { isPointInMud } from "../terrain.js";
import { getDistanceFromPondCenter, getPondGeometry } from "./pondSystem.js";

export function updatePlayer(state, deltaTime) {
  const maxTilt = 12 * (Math.PI / 180);
  const tiltSpeed = 5.5;

  let moveX = 0;
  let moveY = 0;

  if (state.input.up) moveY -= 1;
  if (state.input.down) moveY += 1;
  if (state.input.left) moveX -= 1;
  if (state.input.right) moveX += 1;

  const hasMoveX = moveX > 0 || moveX < 0;
  const hasMoveY = moveY > 0 || moveY < 0;
  const movingDiagonally = hasMoveX && hasMoveY;
  if (movingDiagonally) {
    const diagonalScale = Math.SQRT1_2;
    moveX *= diagonalScale;
    moveY *= diagonalScale;
  }

  if (hasMoveX) {
    state.player.facingX = moveX;
  }
  if (moveY < 0) state.player.targetTilt = -maxTilt;
  if (moveY > 0) state.player.targetTilt = maxTilt;
  if (moveY === 0) state.player.targetTilt = 0;
  state.player.tilt = moveTowards(state.player.tilt, state.player.targetTilt, tiltSpeed * deltaTime);

  const terrainSpeedMultiplier = getBeaverTerrainSpeedMultiplier(state);
  const beaverSpeed = state.player.speed * terrainSpeedMultiplier;
  state.player.x += moveX * beaverSpeed * deltaTime;
  state.player.y += moveY * beaverSpeed * deltaTime;

  const halfSize = state.player.size / 2;
  state.player.x = clamp(state.player.x, halfSize, state.canvas.width - halfSize);
  state.player.y = clamp(state.player.y, halfSize, state.canvas.height - halfSize);
}

function getBeaverTerrainSpeedMultiplier(state) {
  const pond = getPondGeometry(state);
  const distanceFromLodge = getDistanceFromPondCenter(state.player.x, state.player.y, pond);
  const isInPond = distanceFromLodge <= pond.outerRadius;

  if (isInPond) return 1;
  if (isPointInMud(state.player.x, state.player.y, state.terrainState)) return 0.28;
  return 0.45;
}
