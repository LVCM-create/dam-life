export function drawWinterPanel(ctx, state) {
  if (state.winter.active === false) return;

  const panelWidth = 520;
  const panelHeight = 286;
  const panelX = (state.canvas.width - panelWidth) / 2;
  const panelY = (state.canvas.height - panelHeight) / 2;

  ctx.fillStyle = "rgba(16, 24, 36, 0.84)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  ctx.strokeStyle = "rgba(190, 219, 247, 0.65)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#e5f1ff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = "bold 30px Helvetica, Arial, sans-serif";
  ctx.fillText("Winter", panelX + 22, panelY + 42);
  ctx.font = "18px Helvetica, Arial, sans-serif";
  ctx.fillText("Events left: " + state.winter.stepsRemaining, panelX + 22, panelY + 72);

  if (state.winter.currentEvent) {
    const event = state.winter.currentEvent;
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#b8d5ef";
    ctx.fillText(event.category, panelX + 22, panelY + 96);

    ctx.font = "bold 22px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#e5f1ff";
    ctx.fillText(event.title, panelX + 22, panelY + 122);
    ctx.font = "17px Helvetica, Arial, sans-serif";
    drawWrappedText(ctx, event.body, panelX + 22, panelY + 148, panelWidth - 44, 22);

    for (let i = 0; i < event.choices.length; i += 1) {
      const y = panelY + 198 + i * 28;
      ctx.fillStyle = "#d9e9fb";
      ctx.fillText((i + 1) + ". " + event.choices[i].label, panelX + 30, y);
    }
  }

  if (state.winter.lastOutcome) {
    ctx.fillStyle = "#b6d1ed";
    ctx.font = "16px Helvetica, Arial, sans-serif";
    drawWrappedText(ctx, state.winter.lastOutcome, panelX + 22, panelY + panelHeight - 30, panelWidth - 44, 18);
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, lineY);
  }
}
