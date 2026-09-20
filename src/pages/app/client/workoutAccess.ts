import type { WorkoutAccessState } from "../../../api/types";

/**
 * Как тренировка выглядит у клиента. Состояние приходит с сервера: доступ считает он,
 * а не браузер.
 */
/** Коротко — это подпись на чипе. Развёрнутое объяснение живёт в STATE_TITLE, во всплывашке. */
export const STATE_LABEL: Record<WorkoutAccessState, string> = {
  LOCKED: "закрыто",
  AVAILABLE: "можно открыть",
  OPEN: "открыта",
  CLOSED: "посещена",
  MISSED: "пропущена",
};

/**
 * Чип в списке тренировок. Пройденная тренировка залита зелёным — так же, как
 * «Выполнена» у тренера: у клиента и тренера одно и то же событие должно
 * выглядеть одинаково.
 */
export const STATE_CHIP: Record<WorkoutAccessState, string> = {
  LOCKED: "border-dashed border-ink/30 text-ink/50",
  AVAILABLE: "border-solid border-primary text-primary",
  OPEN: "border-solid border-primary bg-primary text-white",
  CLOSED: "border-solid border-primary bg-primary text-white",
  MISSED: "border-solid border-coral text-coral",
};

/**
 * Плашка в календаре: те же состояния, но заливкой, как у тренера.
 *
 * У открытой тренировки заливка светлая: рядом, в списке ниже, есть чип «Продолжить»,
 * и два ярко-зелёных пятна об одном и том же смотрелись бы как две разные кнопки.
 */
export const STATE_PILL: Record<WorkoutAccessState, string> = {
  LOCKED: "border-solid border-ink/30 bg-offwhite text-ink",
  AVAILABLE: "border-solid border-primary bg-transparent text-ink",
  OPEN: "border-solid border-primary bg-mint/40 text-ink",
  CLOSED: "border-solid border-primary bg-primary text-white",
  MISSED: "border-solid border-coral bg-coral text-white",
};

export const STATE_TITLE: Record<WorkoutAccessState, string> = {
  LOCKED: "Откроется в свой день",
  AVAILABLE: "Сегодня её день — можно открыть",
  OPEN: "Открыта: осталось время из трёх часов",
  CLOSED: "Тренировка пройдена",
  MISSED: "День прошёл, тренировка не открыта",
};

/** Цвет точки в ленте дней: состояние тренировки одним пятнышком. */
export const STATE_DOT: Record<WorkoutAccessState, string> = {
  LOCKED: "bg-ink/35",
  AVAILABLE: "border border-primary bg-transparent",
  OPEN: "bg-lime",
  CLOSED: "bg-primary",
  MISSED: "bg-coral",
};
