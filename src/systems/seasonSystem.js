import {
  AUTUMN_DURATION,
  AUTUMN_WARNING_TIME,
  GROWTH_DURATION,
  PHASE_CARD_DURATION,
  YEAR_PHASE_AUTUMN,
  YEAR_PHASE_GROWTH,
  YEAR_PHASE_WINTER,
} from "../config.js";
import { startWinter } from "./winterEventSystem.js";

export function initializeSeason(state) {
  state.season = {
    phase: YEAR_PHASE_GROWTH,
    phaseElapsed: 0,
    autumnWarningShown: false,
    phaseCardDuration: PHASE_CARD_DURATION,
    transitionCard: {
      active: false,
      title: "",
      subtitle: "",
      pauseGameplay: false,
      variant: "standard",
      requiresInput: false,
      timer: 0,
    },
  };
}

export function updateSeason(state, deltaTime) {
  if (state.season.transitionCard.active) {
    if (state.season.transitionCard.requiresInput === false) {
      state.season.transitionCard.timer -= deltaTime;
      if (state.season.transitionCard.timer <= 0) {
        state.season.transitionCard.active = false;
        state.season.transitionCard.timer = 0;
      }
    }
  }

  if (state.season.phase === YEAR_PHASE_WINTER) return;

  state.season.phaseElapsed += deltaTime;

  if (
    state.season.phase === YEAR_PHASE_AUTUMN &&
    state.season.autumnWarningShown === false &&
    state.season.phaseElapsed >= AUTUMN_DURATION - AUTUMN_WARNING_TIME
  ) {
    state.season.autumnWarningShown = true;
    showTransitionCard(state, "The cold is coming", "", false, "notice", false);
  }

  if (state.season.phase === YEAR_PHASE_GROWTH && state.season.phaseElapsed >= GROWTH_DURATION) {
    state.season.phase = YEAR_PHASE_AUTUMN;
    state.season.phaseElapsed = 0;
    state.season.autumnWarningShown = false;
    showTransitionCard(state, "AUTUMN BEGINS", "Prepare stockpile for winter", true, "standard", false);
    return;
  }

  if (state.season.phase === YEAR_PHASE_AUTUMN && state.season.phaseElapsed >= AUTUMN_DURATION) {
    state.season.phase = YEAR_PHASE_WINTER;
    state.season.phaseElapsed = 0;
    showTransitionCard(
      state,
      "WINTER",
      "The pond is frozen. Every choice now trades warmth, stockpile, or safety.",
      true,
      "winter_shift",
      true
    );
    startWinter(state);
  }
}

export function isRealtimeSeason(state) {
  return state.season.phase === YEAR_PHASE_GROWTH || state.season.phase === YEAR_PHASE_AUTUMN;
}

export function getPhaseLabel(state) {
  if (state.season.phase === YEAR_PHASE_GROWTH) return "Growth";
  if (state.season.phase === YEAR_PHASE_AUTUMN) return "Autumn";
  return "Winter";
}

export function showTransitionCard(
  state,
  title,
  subtitle = "",
  pauseGameplay = false,
  variant = "standard",
  requiresInput = false
) {
  state.season.transitionCard = {
    active: true,
    title,
    subtitle,
    pauseGameplay,
    variant,
    requiresInput,
    timer: state.season.phaseCardDuration,
  };
}
