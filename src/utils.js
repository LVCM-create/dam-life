export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function moveTowards(current, target, maxStep) {
  if (current < target) return Math.min(current + maxStep, target);
  if (current > target) return Math.max(current - maxStep, target);
  return current;
}

export function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

export function getDistance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}