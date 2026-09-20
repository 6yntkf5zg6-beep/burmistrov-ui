import type { ScheduledWorkoutResponse } from "../../../api/types";

/**
 * В каком виде тренировка показывается тренеру — в календаре и в истории.
 *
 * Пока клиент к ней не притрагивался, вопрос один: собрана ли она и не прошёл ли уже её день.
 * Как только клиент открыл тренировку, заполненность отходит на второй план — теперь важно,
 * идёт она прямо сейчас или уже позади.
 */
export type WorkoutState = "unplanned" | "planned" | "missed" | "inProgress" | "done";

/** Хоть одно значение веса или повторений где-нибудь стоит. */
export function hasAnyValue(workout: ScheduledWorkoutResponse["workout"]): boolean {
  return workout.exercises.some((exercise) =>
    exercise.sets.some((set) => set.reps != null || set.weightKg != null),
  );
}

function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function workoutState(sw: ScheduledWorkoutResponse): WorkoutState {
  if (sw.attendance?.attendedAt) {
    const expiresAt = sw.attendance.expiresAt;
    return expiresAt != null && Date.now() < new Date(expiresAt).getTime() ? "inProgress" : "done";
  }
  // День прошёл, а клиент не заходил — дозаполнять веса поздно, это пропуск.
  if (sw.scheduledDate < todayISO()) return "missed";
  return hasAnyValue(sw.workout) ? "planned" : "unplanned";
}

export const WORKOUT_STATE_TITLE: Record<WorkoutState, string> = {
  unplanned: "Ни одного веса или повторения — тренировка ещё не собрана",
  planned: "Веса проставлены, клиент тренировку ещё не открывал",
  missed: "День прошёл, клиент тренировку не открывал",
  inProgress: "Клиент открыл тренировку, окно доступа ещё не закрылось",
  done: "Клиент прошёл тренировку",
};

/** Короткая подпись: в истории это чип, в календаре — приписка к названию. */
export const WORKOUT_STATE_LABEL: Record<WorkoutState, string> = {
  unplanned: "Не запланирована",
  planned: "Запланирована",
  missed: "Пропущена",
  inProgress: "В процессе",
  done: "Выполнена",
};

/**
 * Плашка залита тёмным цветом, и текст на ней белый: тренировка пройдена или пропущена.
 * Салатовая «в процессе» сюда не входит — она светлая, текст на ней остаётся тёмным.
 */
function isSolidPill(state: WorkoutState): boolean {
  return state === "done" || state === "missed";
}

const WORKOUT_STATE_CHIP: Record<WorkoutState, string> = {
  unplanned: "border-dashed border-ink/30 text-ink/50",
  planned: "border-solid border-ink/30 text-ink/70",
  missed: "border-solid border-coral text-coral",
  inProgress: "border-solid border-primary bg-primary text-white",
  done: "border-solid border-primary bg-primary text-white",
};

const WORKOUT_STATE_PILL: Record<WorkoutState, string> = {
  unplanned: "border-dashed border-ink/30 bg-transparent text-ink",
  planned: "border-solid border-ink/30 bg-offwhite text-ink",
  missed: "border-solid border-coral bg-coral text-white",
  inProgress: "border-solid border-primary bg-lime text-ink",
  done: "border-solid border-primary bg-primary text-white",
};

/** Пустая тренировка рисуется пунктиром в любом дне: и в будущем, и в прошедшем. */
function isDashed(sw: ScheduledWorkoutResponse, state: WorkoutState): boolean {
  return (state === "unplanned" || state === "missed") && !hasAnyValue(sw.workout);
}

/** Как выглядит чип состояния в истории. */
export function workoutChip(sw: ScheduledWorkoutResponse): string {
  const state = workoutState(sw);
  // Пунктир значит «нет ни одного значения», цвет — что стало с тренировкой.
  if (isDashed(sw, state) && state === "missed") {
    return "border-dashed border-coral text-coral";
  }
  return WORKOUT_STATE_CHIP[state];
}

/**
 * Как выглядит плашка дня в календаре.
 *
 * Пунктир значит «в тренировке нет ни одного значения», а не «её день ещё не наступил»,
 * поэтому пустая прошедшая тренировка тоже остаётся пунктирной — только окантовка у неё
 * коралловая, чтобы пропуск не потерялся. Заливка бывает только у тех дней, про которые
 * уже есть что сказать.
 *
 * @returns {@code solid} — плашка залита тёмным, значит текст и крестик на ней белые.
 */
export function workoutPill(sw: ScheduledWorkoutResponse): { className: string; solid: boolean } {
  const state = workoutState(sw);

  if (isDashed(sw, state)) {
    return {
      className:
        state === "missed"
          ? "border-dashed border-coral bg-transparent text-ink"
          : "border-dashed border-ink/30 bg-transparent text-ink",
      solid: false,
    };
  }

  return { className: WORKOUT_STATE_PILL[state], solid: isSolidPill(state) };
}

/** Цвет точки в компактном календаре: состояние тренировки одним пятнышком. */
const WORKOUT_STATE_DOT: Record<WorkoutState, string> = {
  unplanned: "border border-ink/35 bg-transparent",
  planned: "bg-ink/35",
  missed: "bg-coral",
  inProgress: "bg-lime",
  done: "bg-primary",
};

export function workoutDot(sw: ScheduledWorkoutResponse): string {
  return WORKOUT_STATE_DOT[workoutState(sw)];
}
