const PRIME_DAM_EFFICIENCY = 1.0;
const NORMAL_DAM_EFFICIENCY = 0.35;

export function getPrimeDamBand(stream) {
  const bandWidth = 38;
  const bandCenterX = stream.endX - 52;
  return {
    x: bandCenterX - bandWidth / 2,
    y: stream.centerY - stream.rightHeight * 0.44,
    width: bandWidth,
    height: stream.rightHeight * 0.88,
  };
}

export function isPointInPrimeDamBand(x, y, stream) {
  const band = getPrimeDamBand(stream);
  return x >= band.x && x <= band.x + band.width && y >= band.y && y <= band.y + band.height;
}

export function getDamEfficiencyTier(x, y, stream) {
  return isPointInPrimeDamBand(x, y, stream) ? "prime" : "normal";
}

export function getDamEfficiencyValue(tier) {
  if (tier === "prime") return PRIME_DAM_EFFICIENCY;
  return NORMAL_DAM_EFFICIENCY;
}

export function getTotalDamStrength(damTiles) {
  return damTiles.reduce((total, tile) => {
    if (typeof tile.efficiency === "number") return total + tile.efficiency;
    return total + NORMAL_DAM_EFFICIENCY;
  }, 0);
}
