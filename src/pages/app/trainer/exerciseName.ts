/**
 * Проверка тёзок упражнения на стороне формы. Правило то же, что на бэкенде
 * (`ExerciseService.requireNameIsFree`): без учёта регистра и окружающих пробелов.
 *
 * Здесь это подсказка, а не гарантия: каталог во вкладке может устареть, поэтому последнее
 * слово всё равно за сервером — он вернёт 409.
 */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

export function isDuplicateExerciseName(name: string, existingNames: string[]): boolean {
  const normalized = normalizeExerciseName(name);
  if (!normalized) return false;
  return existingNames.some((existing) => normalizeExerciseName(existing) === normalized);
}

export const DUPLICATE_EXERCISE_MESSAGE = "Упражнение с таким названием уже есть";
