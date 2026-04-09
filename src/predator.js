export function createPredator(x, y) {
  return {
    x,
    y,
    size: 28,
    speed: 120,
    state: "normal",
    color: "#c3342f",
  };
}

export function drawPredator(ctx, predator, color) {
  const renderSize = predator.size * 1.35;
  const bodyRadius = renderSize * 0.38;
  const headRadius = renderSize * 0.28;
  const earRadius = renderSize * 0.11;

  ctx.save();
  ctx.translate(predator.x, predator.y);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 4, bodyRadius * 1.05, bodyRadius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -bodyRadius * 0.55, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-headRadius * 0.65, -bodyRadius * 1.1, earRadius, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.65, -bodyRadius * 1.1, earRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(240, 240, 240, 0.8)";
  ctx.beginPath();
  ctx.ellipse(0, -bodyRadius * 0.45, headRadius * 0.45, headRadius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#161616";
  ctx.beginPath();
  ctx.arc(-headRadius * 0.28, -bodyRadius * 0.65, 2, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.28, -bodyRadius * 0.65, 2, 0, Math.PI * 2);
  ctx.arc(0, -bodyRadius * 0.45, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}