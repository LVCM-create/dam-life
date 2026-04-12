import { YEAR_PHASE_GROWTH, WINTER_EVENT_STEPS } from "../config.js";
import { applyYearEndTransition } from "./yearSystem.js";
import { restoreHunger } from "./hungerSystem.js";

export function startWinter(state) {
  state.winter.active = true;
  state.winter.stepsRemaining = WINTER_EVENT_STEPS;
  state.winter.currentEvent = null;
  state.winter.pendingChoice = null;
  state.winter.lastOutcome = "";
}

export function setWinterChoice(state, choiceIndex) {
  if (state.winter.active === false) return;
  state.winter.pendingChoice = choiceIndex;
}

export function updateWinterMode(state) {
  if (state.winter.active === false) return;

  if (state.winter.currentEvent === null) {
    state.winter.currentEvent = createWinterEvent(state);
    return;
  }

  if (state.winter.pendingChoice === null) return;

  const event = state.winter.currentEvent;
  const selected = event.choices[state.winter.pendingChoice];
  if (selected) {
    selected.apply(state);
    state.winter.lastOutcome = selected.outcome;
  }

  if (state.foodStockpile > 0) {
    state.foodStockpile -= 1;
    restoreHunger(state, 2);
  } else {
    state.hunger = Math.max(0, state.hunger - 4);
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

  applyYearEndTransition(state);

  state.season.phase = YEAR_PHASE_GROWTH;
  state.season.phaseElapsed = 0;
  state.season.autumnWarningShown = false;
  state.season.transitionCard = {
    active: true,
    title: "YEAR " + state.year + " - GROWTH",
    subtitle: "",
    pauseGameplay: false,
    variant: "standard",
    timer: state.season.phaseCardDuration,
  };
}

function createWinterEvent(state) {
  const roll = Math.random();

  if (roll < 0.34) {
    return {
      category: "Food Pressure",
      title: "Stockpile Stores",
      body: "Frost creeps into the lodge. Spend less now, or spend more to stay strong.",
      choices: [
        {
          label: "Strict Rations",
          outcome: "You stretch supplies, but stay hungry.",
          apply: (s) => {
            s.foodStockpile = Math.max(0, s.foodStockpile - 1);
            s.hunger = Math.max(0, s.hunger - 2);
          },
        },
        {
          label: "Hearty Meal",
          outcome: "Warmth returns, but stores drop fast.",
          apply: (s) => {
            s.foodStockpile = Math.max(0, s.foodStockpile - 2);
            restoreHunger(s, 8);
          },
        },
      ],
    };
  }

  if (roll < 0.67) {
    return {
      category: "Dam Integrity",
      title: "Dam Leak",
      body: "Ice pressure splits a weak seam. Patch now, or let water slip away.",
      choices: [
        {
          label: "Emergency Patch",
          outcome: "The leak slows, but the work drains you.",
          apply: (s) => {
            s.waterLevel *= 0.95;
            s.targetWaterLevel *= 0.95;
            s.hunger = Math.max(0, s.hunger - 3);
            s.resources.wood = Math.max(0, s.resources.wood - 1);
          },
        },
        {
          label: "Hold Position",
          outcome: "You stay warm now, but the pond shrinks.",
          apply: (s) => {
            s.waterLevel *= 0.8;
            s.targetWaterLevel *= 0.8;
            s.hunger = Math.max(0, s.hunger - 1);
          },
        },
      ],
    };
  }

  return {
    category: "Exposure Risk",
    title: "Exposure Risk",
    body: "Tracks circle the frozen bank. Leave shelter for supplies, or stay hidden.",
    choices: [
      {
        label: "Stay Hidden",
        outcome: "You remain safe, but hunger lingers.",
        apply: (s) => {
          s.hunger = Math.max(0, s.hunger - 5);
        },
      },
      {
        label: "Risk a Forage Run",
        outcome: "You step into the snow and gamble.",
        apply: (s) => {
          const chance = Math.random();
          if (chance < 0.4) {
            s.foodStockpile += 2;
            s.hunger = Math.max(0, s.hunger - 4);
            s.winter.lastOutcome = "You return with a useful cache.";
          } else if (chance < 0.78) {
            s.hunger = Math.max(0, s.hunger - 9);
            s.winter.lastOutcome = "You return empty and freezing.";
          } else {
            s.hunger = Math.max(0, s.hunger - 13);
            s.foodStockpile = Math.max(0, s.foodStockpile - 1);
            s.predatorAwarenessTimer = Math.max(0, s.predatorAwarenessTimer - 0.6);
            s.winter.lastOutcome = "A predator drives you back and you lose supplies.";
          }
        },
      },
    ],
  };
}
