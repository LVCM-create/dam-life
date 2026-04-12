import {
  PREDATOR_AWARENESS_DELAY,
  REEDS_DETECTION_RADIUS,
  REEDS_CHASE_SPEED_MULTIPLIER,
  PREDATOR_CIRCLE_MIN_DURATION,
  PREDATOR_CIRCLE_MAX_DURATION,
} from "../config.js";
import { getDistance, getRandomRange, clamp } from "../utils/math.js";
import { isPointInReeds } from "../terrain.js";
import {
  getPondGeometry,
  getDistanceFromPondCenter,
  projectPointToPondRadius,
} from "./pondSystem.js";

export function updatePredator(state, deltaTime) {
  if (state.predatorAwarenessTimer < PREDATOR_AWARENESS_DELAY) {
    state.predatorAwarenessTimer += deltaTime;
    state.predator.state = "idle";
    return;
  }

  const pond = getPondGeometry(state);
  const playerInReeds = isPointInReeds(state.player.x, state.player.y, state.terrainState);
  const reedsSpeedMultiplier = playerInReeds ? REEDS_CHASE_SPEED_MULTIPLIER : 1;
  const pacingSpeedMultiplier = getPredatorSpeedMultiplier(state.runTime);
  const currentDistanceFromLodge = getDistanceFromPondCenter(state.predator.x, state.predator.y, pond);

  if (currentDistanceFromLodge < pond.innerRadius) {
    const safePosition = projectPointToPondRadius(state.predator.x, state.predator.y, pond, pond.innerRadius + 0.1);
    state.predator.x = safePosition.x;
    state.predator.y = safePosition.y;
    beginPredatorCircling(state);
    return;
  }

  const pondZone = getPredatorPondZone(state);
  if (state.predator.state === "circle" && state.predator.stateTimer > 0) {
    updatePredatorCircleMovement(state, deltaTime, pond, pondZone.speedMultiplier, reedsSpeedMultiplier, pacingSpeedMultiplier);
    return;
  }

  let targetX = state.player.x;
  let targetY = state.player.y;
  let usingLastKnownPosition = false;

  const predatorDistanceToPlayer = getDistance(state.predator.x, state.predator.y, state.player.x, state.player.y);

  if (playerInReeds && predatorDistanceToPlayer > REEDS_DETECTION_RADIUS) {
    const hasKnownX = state.predator.lastKnownPlayerX === null;
    const hasKnownY = state.predator.lastKnownPlayerY === null;

    if (hasKnownX === false && hasKnownY === false) {
      targetX = state.predator.lastKnownPlayerX;
      targetY = state.predator.lastKnownPlayerY;
      usingLastKnownPosition = true;
    } else {
      state.predator.state = "search";
      return;
    }
  } else {
    state.predator.lastKnownPlayerX = state.player.x;
    state.predator.lastKnownPlayerY = state.player.y;
  }

  state.predator.state = usingLastKnownPosition ? "search" : pondZone.state;

  const dx = targetX - state.predator.x;
  const dy = targetY - state.predator.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return;

  const dirX = dx / distance;
  const dirY = dy / distance;
  const effectiveSpeed =
    state.predator.speed * pondZone.speedMultiplier * reedsSpeedMultiplier * pacingSpeedMultiplier;

  const nextX = state.predator.x + dirX * effectiveSpeed * deltaTime;
  const nextY = state.predator.y + dirY * effectiveSpeed * deltaTime;
  const nextDistanceFromLodge = getDistanceFromPondCenter(nextX, nextY, pond);

  if (nextDistanceFromLodge < pond.innerRadius) {
    const boundaryPosition = projectPointToPondRadius(nextX, nextY, pond, pond.innerRadius + 0.1);
    state.predator.x = boundaryPosition.x;
    state.predator.y = boundaryPosition.y;
    beginPredatorCircling(state);
  } else {
    state.predator.x = nextX;
    state.predator.y = nextY;
  }

  const halfSize = state.predator.size / 2;
  state.predator.x = clamp(state.predator.x, halfSize, state.canvas.width - halfSize);
  state.predator.y = clamp(state.predator.y, halfSize, state.canvas.height - halfSize);
}

export function checkGameOver(state, onHit) {
  const reachDistance = (state.player.size + state.predator.size) / 2;
  const predatorDistance = getDistance(state.player.x, state.player.y, state.predator.x, state.predator.y);

  if (predatorDistance <= reachDistance) {
    saveFinalStats(state);
    onHit();
    state.gameOver = true;
  }
}

export function getPredatorColor(state) {
  if (state.predator.state === "idle") return "#9ca3af";
  if (state.predator.state === "circle") return "#b65c2f";
  if (state.predator.state === "search") return "#8b5a2b";
  if (state.predator.state === "blocked") return "#6b7280";
  if (state.predator.state === "medium") return "#1f7a8f";
  if (state.predator.state === "shallow") return "#d97706";
  return state.predator.color;
}

export function updateWinCondition(state, getPondGeometryFn) {
  if (state.gameOver) return;

  if (state.pondStability >= 100) {
    saveFinalStats(state, getPondGeometryFn);
    state.hasWon = true;
  }
}

function saveFinalStats(state, getPondGeometryFn = getPondGeometry) {
  state.finalStats.timeSurvived = state.runTime;
  state.finalStats.pondSize = getPondGeometryFn(state).outerRadius;
}

function beginPredatorCircling(state) {
  state.predator.state = "circle";
  state.predator.stateTimer = getRandomRange(PREDATOR_CIRCLE_MIN_DURATION, PREDATOR_CIRCLE_MAX_DURATION);
  state.predator.circleDirection = Math.random() < 0.5 ? -1 : 1;
}

function updatePredatorCircleMovement(
  state,
  deltaTime,
  pond,
  pondSpeedMultiplier,
  reedsSpeedMultiplier,
  pacingSpeedMultiplier
) {
  const circleRadius = pond.innerRadius + 0.1;
  const dx = state.predator.x - pond.centerX;
  const dy = state.predator.y - pond.centerY;
  const normalizedDx = dx / pond.xScale;
  const normalizedDy = dy / pond.yScale;
  const distance = Math.hypot(normalizedDx, normalizedDy);

  if (distance <= 0.0001) {
    const safePosition = projectPointToPondRadius(state.predator.x, state.predator.y, pond, circleRadius);
    state.predator.x = safePosition.x;
    state.predator.y = safePosition.y;
    state.predator.stateTimer -= deltaTime;
    if (state.predator.stateTimer <= 0) state.predator.state = "normal";
    return;
  }

  const radialX = normalizedDx / distance;
  const radialY = normalizedDy / distance;
  const tangentX = -radialY * pond.xScale * state.predator.circleDirection;
  const tangentY = radialX * pond.yScale * state.predator.circleDirection;
  const tangentLength = Math.hypot(tangentX, tangentY);

  const dirX = tangentLength > 0 ? tangentX / tangentLength : 0;
  const dirY = tangentLength > 0 ? tangentY / tangentLength : 0;
  const effectiveSpeed =
    state.predator.speed * pondSpeedMultiplier * reedsSpeedMultiplier * pacingSpeedMultiplier;

  const movedX = state.predator.x + dirX * effectiveSpeed * deltaTime;
  const movedY = state.predator.y + dirY * effectiveSpeed * deltaTime;
  const boundaryPosition = projectPointToPondRadius(movedX, movedY, pond, circleRadius);

  state.predator.x = boundaryPosition.x;
  state.predator.y = boundaryPosition.y;

  const halfSize = state.predator.size / 2;
  state.predator.x = clamp(state.predator.x, halfSize, state.canvas.width - halfSize);
  state.predator.y = clamp(state.predator.y, halfSize, state.canvas.height - halfSize);

  if (getDistanceFromPondCenter(state.predator.x, state.predator.y, pond) < pond.innerRadius) {
    const safePosition = projectPointToPondRadius(state.predator.x, state.predator.y, pond, circleRadius);
    state.predator.x = safePosition.x;
    state.predator.y = safePosition.y;
  }

  state.predator.stateTimer -= deltaTime;
  if (state.predator.stateTimer <= 0) {
    state.predator.state = "normal";
    state.predator.stateTimer = 0;
  }
}

function getPredatorPondZone(state) {
  const pond = getPondGeometry(state);
  const distanceFromLodge = getDistanceFromPondCenter(state.predator.x, state.predator.y, pond);

  if (distanceFromLodge <= pond.innerRadius) {
    return { state: "blocked", speedMultiplier: 0 };
  }

  if (distanceFromLodge <= pond.middleRadius) {
    return { state: "medium", speedMultiplier: 0.55 };
  }

  if (distanceFromLodge <= pond.outerRadius) {
    return { state: "shallow", speedMultiplier: 0.75 };
  }

  return { state: "normal", speedMultiplier: 1 };
}

function getPredatorSpeedMultiplier(currentRunTime) {
  if (currentRunTime < 25) return 1.0;
  if (currentRunTime < 55) return 1.08;
  return 1.16;
}
