export function drawIntroScreen(ctx, state) {
  drawIntroLandscape(ctx, state.canvas);
  drawIntroHelicopter(ctx, state);
  drawIntroParachuteBeaver(ctx, state);
  drawGameTitle(ctx, state.canvas.width / 2, 74, 66);

  const boxWidth = state.canvas.width - 280;
  const boxHeight = 152;
  const boxX = (state.canvas.width - boxWidth) / 2;
  const boxY = state.canvas.height - boxHeight - 78;

  ctx.fillStyle = "rgba(10, 26, 18, 0.64)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#f7f6ef";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 29px Helvetica, Arial, sans-serif";
  ctx.fillText("Good news!", state.canvas.width / 2, boxY + 38);
  ctx.font = "21px Helvetica, Arial, sans-serif";
  ctx.fillText("Your friends at the Nature Conservancy", state.canvas.width / 2, boxY + 70);
  ctx.fillText("have parachuted you into the perfect spot", state.canvas.width / 2, boxY + 98);
  ctx.fillText("to start a new life.", state.canvas.width / 2, boxY + 126);

  const promptAlpha = 0.56 + (Math.sin(state.introAnimTime * 4.2) * 0.5 + 0.5) * 0.44;
  ctx.fillStyle = "rgba(247, 246, 239, " + promptAlpha + ")";
  ctx.font = "21px Helvetica, Arial, sans-serif";
  ctx.fillText("Press any key to start", state.canvas.width / 2, state.canvas.height - 24);
}

export function drawInstructionOverlay(ctx, state) {
  drawGameTitle(ctx, state.canvas.width / 2, 54, 38);

  const panelX = 22;
  const panelY = 104;
  const panelWidth = 360;
  const panelHeight = 230;

  ctx.fillStyle = "rgba(12, 18, 20, 0.64)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#f7f6ef";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillText("How to play", panelX + 18, panelY + 36);
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText("Move: WASD / Arrow Keys", panelX + 18, panelY + 72);
  ctx.fillText("Collect wood: E", panelX + 18, panelY + 102);
  ctx.fillText("Build dam: B or Space (in stream)", panelX + 18, panelY + 132);
  ctx.fillText("Stockpile food near lodge: F", panelX + 18, panelY + 162);
  ctx.fillText("Winter choices: keys 1, 2, 3", panelX + 18, panelY + 192);

  const promptWidth = 318;
  const promptHeight = 36;
  const promptX = (state.canvas.width - promptWidth) / 2;
  const promptY = state.canvas.height - 56;
  const promptAlpha = 0.52 + (Math.sin(state.introAnimTime * 4) * 0.5 + 0.5) * 0.24;

  ctx.fillStyle = "rgba(12, 18, 20, " + promptAlpha + ")";
  ctx.fillRect(promptX, promptY - 24, promptWidth, promptHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(247, 246, 239, 0.9)";
  ctx.font = "19px Helvetica, Arial, sans-serif";
  ctx.fillText("Press any key to start", state.canvas.width / 2, promptY);
}

export function drawGameOverMessage(ctx, state) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  drawGameTitle(ctx, state.canvas.width / 2, state.canvas.height / 2 - 108, 62);
  const cause = state.finalStats.cause;
  const headline = cause === "hunger" || cause === "winter_starvation" ? "You starved" : "You were caught";
  const subtext = cause === "winter_starvation" ? "Not enough stockpile for Winter" : "";

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText(headline, state.canvas.width / 2, state.canvas.height / 2 - 44);
  if (subtext) {
    ctx.font = "22px Helvetica, Arial, sans-serif";
    ctx.fillText(subtext, state.canvas.width / 2, state.canvas.height / 2 - 10);
  }
  ctx.font = "22px Helvetica, Arial, sans-serif";
  ctx.fillText("Year reached: " + state.year, state.canvas.width / 2, state.canvas.height / 2 + 18);
  ctx.fillText("Phase: " + capitalizePhase(state.season.phase), state.canvas.width / 2, state.canvas.height / 2 + 48);
  ctx.fillText("Survived: " + state.finalStats.timeSurvived.toFixed(1) + "s", state.canvas.width / 2, state.canvas.height / 2 + 78);
  ctx.fillText("Press R to restart", state.canvas.width / 2, state.canvas.height / 2 + 110);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function drawPhaseTransitionCard(ctx, state) {
  if (state.season.transitionCard.variant === "winter_shift") {
    drawWinterShiftCard(ctx, state);
    return;
  }

  const cardWidth = 470;
  const cardHeight = 154;
  const cardX = (state.canvas.width - cardWidth) / 2;
  const cardY = (state.canvas.height - cardHeight) / 2;

  ctx.fillStyle = "rgba(10, 17, 26, 0.78)";
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  ctx.strokeStyle = "rgba(222, 238, 251, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

  ctx.fillStyle = "#f2f7fb";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Helvetica, Arial, sans-serif";
  ctx.fillText(state.season.transitionCard.title, state.canvas.width / 2, cardY + 63);
  if (state.season.transitionCard.subtitle) {
    ctx.font = "23px Helvetica, Arial, sans-serif";
    ctx.fillText(state.season.transitionCard.subtitle, state.canvas.width / 2, cardY + 102);
  }
  ctx.font = "18px Helvetica, Arial, sans-serif";
  ctx.fillText("Year " + state.year, state.canvas.width / 2, cardY + 130);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawWinterShiftCard(ctx, state) {
  ctx.fillStyle = "rgba(9, 15, 23, 0.94)";
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  ctx.fillStyle = "rgba(147, 192, 229, 0.2)";
  ctx.beginPath();
  ctx.ellipse(state.canvas.width * 0.5, state.canvas.height * 0.72, 280, 74, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d3f52";
  ctx.fillRect(state.canvas.width * 0.5 - 26, state.canvas.height * 0.62 - 18, 52, 36);
  ctx.fillStyle = "#192633";
  ctx.fillRect(state.canvas.width * 0.5 - 8, state.canvas.height * 0.62 - 4, 16, 22);

  ctx.fillStyle = "#e8f2ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 78px Helvetica, Arial, sans-serif";
  ctx.fillText("WINTER", state.canvas.width / 2, state.canvas.height * 0.35);

  ctx.font = "24px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#d4e5f7";
  ctx.fillText("Food is limited.", state.canvas.width / 2, state.canvas.height * 0.48);
  ctx.fillText("The dam must hold.", state.canvas.width / 2, state.canvas.height * 0.54);
  ctx.fillText("Choose carefully.", state.canvas.width / 2, state.canvas.height * 0.6);
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText("Minimum stockpile to survive Winter: 4", state.canvas.width / 2, state.canvas.height * 0.67);

  if (state.season.transitionCard.inputDelayTimer <= 0) {
    ctx.fillStyle = "rgba(232, 242, 255, 0.85)";
    ctx.font = "22px Helvetica, Arial, sans-serif";
    ctx.fillText("Press any key to continue", state.canvas.width / 2, state.canvas.height * 0.9);
  }
}

function drawGameTitle(ctx, x, y, fontSize) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold " + fontSize + "px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(17, 45, 32, 0.45)";
  ctx.fillText("Dam Life", x + 2, y + 2);
  ctx.fillStyle = "#f7f6ef";
  ctx.fillText("Dam Life", x, y);
  ctx.restore();
}

function drawIntroLandscape(ctx, canvas) {
  ctx.fillStyle = "#9fd8ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloud(ctx, 120, 86, 1.1);
  drawCloud(ctx, 300, 62, 0.9);
  drawCloud(ctx, 560, 96, 1.15);
  drawCloud(ctx, 700, 70, 0.75);

  ctx.fillStyle = "#6fa053";
  ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);
  ctx.fillStyle = "#5b8b44";
  ctx.fillRect(0, canvas.height * 0.78, canvas.width, canvas.height * 0.22);
}

function drawIntroHelicopter(ctx, state) {
  const x = ((state.introAnimTime * 20) % (state.canvas.width + 140)) - 70;
  const y = 84 + Math.sin(state.introAnimTime * 0.8) * 5;

  ctx.fillStyle = "#3d4f5c";
  ctx.fillRect(x - 24, y - 8, 44, 16);
  ctx.fillStyle = "#6f8796";
  ctx.fillRect(x + 16, y - 4, 14, 8);
  ctx.strokeStyle = "#2b3a44";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 12);
  ctx.lineTo(x + 28, y - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 12);
  ctx.lineTo(x + 18, y + 12);
  ctx.stroke();
}

function drawIntroParachuteBeaver(ctx, state) {
  const centerX = state.canvas.width / 2;
  const baseY = 116 + Math.sin(state.introAnimTime * 1.3) * 5;

  ctx.fillStyle = "#f15d5d";
  ctx.beginPath();
  ctx.arc(centerX, baseY, 34, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f4e9d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 24, baseY);
  ctx.lineTo(centerX - 8, baseY + 42);
  ctx.moveTo(centerX + 24, baseY);
  ctx.lineTo(centerX + 8, baseY + 42);
  ctx.stroke();

  ctx.fillStyle = "#7b4b2a";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 50, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(centerX + 6, baseY + 49, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx, x, y, scale) {
  const w = 52 * scale;
  const h = 22 * scale;
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.fillRect(x, y, w, h);
  ctx.fillRect(x - 16 * scale, y + 8 * scale, w * 0.55, h * 0.72);
  ctx.fillRect(x + w * 0.56, y + 6 * scale, w * 0.5, h * 0.75);
}

function capitalizePhase(phase) {
  if (!phase) return "Unknown";
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}
