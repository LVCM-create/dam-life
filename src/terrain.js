function isPointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function createTerrainState() {
  return {
    mudZones: [
      { x: 128, y: 252, width: 170, height: 94 },
      { x: 560, y: 248, width: 156, height: 104 },
    ],
    reedZones: [
      { x: 258, y: 144, width: 138, height: 84 },
      { x: 488, y: 136, width: 148, height: 92 },
    ],
  };
}

export function isPointInMud(x, y, terrainState) {
  return terrainState.mudZones.some((zone) => isPointInRect(x, y, zone));
}

export function isPointInReeds(x, y, terrainState) {
  return terrainState.reedZones.some((zone) => isPointInRect(x, y, zone));
}

export function getTerrainAtPoint(x, y, terrainState) {
  if (isPointInMud(x, y, terrainState)) return "mud";
  if (isPointInReeds(x, y, terrainState)) return "reeds";
  return "land";
}
