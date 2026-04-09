export function createPlayer(x, y) {
  return {
    x,
    y,
    size: 28,
    speed: 220,
    color: "#7b4b2a",
    facingX: 1,
    tilt: 0,
    targetTilt: 0,
    pickupPulseTimer: 0,
  };
}

export function drawPlayer(ctx, player, getQuickPulseScale, pulseDuration) {
  const bodyWidth = player.size * 1.02;
  const bodyHeight = player.size * 0.62;
  const headRadius = player.size * 0.2;
  const tailWidth = player.size * 0.56;
  const tailHeight = player.size * 0.26;
  const facingLeft = player.facingX < 0;
  const pulseScale = getQuickPulseScale(player.pickupPulseTimer, pulseDuration, 0.2);
  const shadowOffsetY = player.tilt * 10;

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 12 + shadowOffsetY, bodyWidth * 0.35, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(pulseScale, pulseScale);
  ctx.rotate(player.tilt);
  if (facingLeft) {
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "#4f3a2a";
  ctx.beginPath();
  ctx.ellipse(-bodyWidth * 0.58, 0, tailWidth / 2, tailHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7b4b2a";
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d4224";
  ctx.beginPath();
  ctx.arc(bodyWidth * 0.42, -1, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#674026";
  ctx.beginPath();
  ctx.ellipse(bodyWidth * 0.14, bodyHeight * 0.33, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(bodyWidth * 0.02, bodyHeight * 0.33, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(bodyWidth * 0.46, -headRadius * 0.25, 1.8, 0, Math.PI * 2);
  ctx.arc(bodyWidth * 0.56, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e7a84a";
  ctx.fillRect(bodyWidth * 0.53, 2, 4, 6);
  ctx.fillRect(bodyWidth * 0.58, 2.8, 4, 6);
  ctx.strokeStyle = "#9f6421";
  ctx.lineWidth = 1;
  ctx.strokeRect(bodyWidth * 0.53, 2, 4, 6);
  ctx.strokeRect(bodyWidth * 0.58, 2.8, 4, 6);

  ctx.restore();
}