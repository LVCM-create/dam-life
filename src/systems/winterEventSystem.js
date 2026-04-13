import { YEAR_PHASE_GROWTH, WINTER_EVENT_STEPS, WINTER_UPKEEP_PER_EVENT } from "../config.js";
import { applyYearEndTransition, applyClusterDamDamageByCount } from "./yearSystem.js";
import { restoreHunger } from "./hungerSystem.js";
import { addDamBreakMarkers } from "./resourceSystem.js";

export function startWinter(state) {
  const minimumStockpile = WINTER_EVENT_STEPS * WINTER_UPKEEP_PER_EVENT;
  if (state.foodStockpile < minimumStockpile) {
    state.gameOver = true;
    state.finalStats.cause = "winter_starvation";
    state.winter.active = false;
    state.winter.currentEvent = null;
    state.winter.pendingChoice = null;
    state.winter.lastOutcome = "";
    state.winter.outcomeTimer = 0;
    return;
  }

  state.winter.active = true;
  state.winter.stepsRemaining = WINTER_EVENT_STEPS;
  state.winter.currentEvent = null;
  state.winter.pendingChoice = null;
  state.winter.lastOutcome = "";
  state.winter.outcomeTimer = 0;
  state.winter.pendingGrowthDamBreaks = 0;
  state.winter.slowStartPending = false;
  state.winter.winterDamageWorsened = false;
}

export function setWinterChoice(state, choiceIndex) {
  if (state.winter.active === false) return;
  state.winter.pendingChoice = choiceIndex;
}

export function updateWinterMode(state, deltaTime) {
  if (state.winter.active === false) return;

  if (state.winter.outcomeTimer > 0) {
    state.winter.outcomeTimer = Math.max(0, state.winter.outcomeTimer - deltaTime);
    if (state.winter.outcomeTimer > 0) return;
    state.winter.lastOutcome = "";
  }

  if (state.winter.currentEvent === null) {
    state.winter.currentEvent = createWinterEvent(state);
    return;
  }

  if (state.winter.pendingChoice === null) return;

  const event = state.winter.currentEvent;
  const selected = event.choices[state.winter.pendingChoice];
  if (selected && selected.disabled) {
    state.winter.lastOutcome = selected.disabledMessage || "Not enough stockpile for that choice.";
    state.winter.pendingChoice = null;
    return;
  }
  let eventStockpileCost = 0;
  if (selected) {
    eventStockpileCost = selected.stockpileCost || 0;
    selected.apply(state);
  }

  let upkeepCost = 0;
  if (state.foodStockpile > 0) {
    const consumed = Math.min(WINTER_UPKEEP_PER_EVENT, state.foodStockpile);
    state.foodStockpile -= consumed;
    restoreHunger(state, consumed);
    upkeepCost = consumed;
  } else {
    state.hunger = Math.max(0, state.hunger - 4);
  }

  if (selected) {
    state.winter.lastOutcome =
      selected.outcome +
      " Choice: -" +
      eventStockpileCost +
      " Stockpile. Upkeep: -" +
      upkeepCost +
      " Stockpile.";
    state.winter.outcomeTimer = 1.4;
  }

  state.winter.pendingChoice = null;
  state.winter.currentEvent = null;
  state.winter.stepsRemaining -= 1;

  if (state.winter.stepsRemaining <= 0) {
    endWinter(state);
  }
}

function endWinter(state) {
  state.winter.active = false;
  state.winter.currentEvent = null;
  state.winter.pendingChoice = null;
  state.winter.lastOutcome = "Spring returns.";
  state.winter.outcomeTimer = 0;

  const transitionInfo = applyYearEndTransition(state);
  applyWinterStructuralConsequences(state, transitionInfo);
  if (transitionInfo.driftBrokenTiles.length > 0) {
    addDamBreakMarkers(state, transitionInfo.driftBrokenTiles, "drift");
  }
  state.winter.pendingGrowthDamBreaks = 0;
  state.player.slowStartActive = state.winter.slowStartPending;

  state.player.x = state.world.HOME_X;
  state.player.y = state.world.HOME_Y;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.tilt = 0;
  state.player.targetTilt = 0;
  state.input.up = false;
  state.input.down = false;
  state.input.left = false;
  state.input.right = false;

  state.season.phase = YEAR_PHASE_GROWTH;
  state.season.phaseElapsed = 0;
  state.season.autumnWarningShown = false;
  state.season.transitionCard = {
    active: true,
    title: "YEAR " + state.year + " - GROWTH",
    subtitle: "",
    pauseGameplay: false,
    variant: "standard",
    requiresInput: false,
    inputDelayTimer: 0,
    timer: state.season.phaseCardDuration,
  };
  if (state.winter.winterDamageWorsened) {
    state.season.transitionCard.subtitle = "Winter damage worsened the dam";
  } else if (state.player.slowStartActive) {
    state.season.transitionCard.subtitle = "You are weak from hunger";
  } else if (transitionInfo.expansionApplied) {
    state.season.transitionCard.subtitle = "Expansion Year - the map opens outward.";
  }
}

function createWinterEvent(state) {
  if (Math.random() < 0.5) {
    const canPatch = state.foodStockpile >= 4;
    return {
      title: "Leak in Dam",
      body: "Ice splits a seam near the spillway.",
      choices: [
        {
          label: "Patch -> -4 Stockpile, Safe Spring",
          stockpileCost: 4,
          disabled: canPatch === false,
          disabledMessage: "Not enough stockpile to patch. Choose Stay.",
          outcome: "Patched the leak. Spring should be safer.",
          apply: (s) => {
            s.foodStockpile -= 4;
          },
        },
        {
          label: "Stay -> 0 Cost, More damage in Spring",
          stockpileCost: 0,
          outcome: "You stayed inside. More dam sections will fail in Spring.",
          apply: (s) => {
            s.winter.pendingGrowthDamBreaks += 5;
          },
        },
      ],
    };
  }

  return {
    title: "Food Running Low",
    body: "Stores are thinning before thaw.",
    choices: [
      {
        label: "Eat -> -3 Stockpile, Normal Spring",
        stockpileCost: 3,
        disabled: state.foodStockpile < 3,
        disabledMessage: "Not enough stockpile to eat fully. Choose Ration.",
        outcome: "You eat from reserves and stay steady for Spring.",
        apply: (s) => {
          s.foodStockpile -= 3;
        },
      },
      {
        label: "Ration -> 0 Cost, Slow Spring",
        stockpileCost: 0,
        outcome: "You ration through winter. Spring begins with weak movement.",
        apply: (s) => {
          s.winter.slowStartPending = true;
        },
      },
    ],
  };
}

function applyWinterStructuralConsequences(state, transitionInfo) {
  const modifier = state.winter.pendingGrowthDamBreaks;
  if (modifier === 0) return;

  if (modifier < 0 && transitionInfo.driftBrokenTiles.length > 0) {
    const restoredCount = Math.min(-modifier, transitionInfo.driftBrokenTiles.length);
    for (let i = 0; i < restoredCount; i += 1) {
      state.resources.damTiles.push(transitionInfo.driftBrokenTiles[i]);
    }
    transitionInfo.driftBrokenTiles.splice(0, restoredCount);
    state.winter.lastOutcome =
      "Your winter repairs held. " + restoredCount + " drift break points were prevented.";
    return;
  }

  if (modifier > 0) {
    const extraDamage = applyClusterDamDamageByCount(state.resources.damTiles, modifier, 2);
    state.resources.damTiles = extraDamage.remainingTiles;
    if (extraDamage.brokenTiles.length > 0) {
      addDamBreakMarkers(state, extraDamage.brokenTiles, "winter_consequence");
      state.winter.winterDamageWorsened = true;
      state.winter.lastOutcome = "Winter damage worsened the dam.";
    }
  }
}
