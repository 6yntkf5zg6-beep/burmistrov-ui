import type { FormEvent } from "react";
import type { ExerciseResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { ExerciseMediaFields } from "../../../components/ExerciseMediaFields";
import { Combobox } from "../../../components/Combobox";
import { DUPLICATE_EXERCISE_MESSAGE, isDuplicateExerciseName } from "./exerciseName";
import { useModal } from "../../../hooks/useModal";

export type ExercisePickMode = "existing" | "new";

export interface WorkoutExerciseFormState {
  mode: ExercisePickMode;
  exerciseId: string;
  newExerciseName: string;
  newExerciseDescription: string;
  newExerciseImageUrl: string;
  newExerciseVideoUrl: string;
  notes: string;
}

export function emptyWorkoutExerciseForm(): WorkoutExerciseFormState {
  return {
    mode: "existing",
    exerciseId: "",
    newExerciseName: "",
    newExerciseDescription: "",
    newExerciseImageUrl: "",
    newExerciseVideoUrl: "",
    notes: "",
  };
}

const fieldClass =
  "w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";

function pillButtonClass(active: boolean): string {
  return `flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wide transition ${
    active ? "bg-primary text-white" : "text-ink/50 hover:text-ink"
  }`;
}

interface Props {
  title: string;
  catalog: ExerciseResponse[];
  form: WorkoutExerciseFormState;
  onChange: (form: WorkoutExerciseFormState) => void;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  onUploadError: (message: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function WorkoutExerciseFormModal({
  title,
  catalog,
  form,
  onChange,
  submitLabel,
  submitting,
  error,
  onUploadError,
  onSubmit,
  onClose,
}: Props) {
  useModal(onClose);

  const duplicateName =
    form.mode === "new" && isDuplicateExerciseName(form.newExerciseName, catalog.map((ex) => ex.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6 sm:px-4" onClick={onClose}>
      <div
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-card bg-white p-5 shadow-card sm:max-h-[90vh] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 p-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
        >
          ✕
        </button>

        <h2 className="pr-8 text-lg font-bold text-ink sm:text-xl">{title}</h2>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {/* На телефоне на кнопку приходится около 160 пикселей, и «Существующее
              упражнение» в них не влезает — вторая строка растягивает всю пару. Слово
              «упражнение» и так стоит в заголовке окна, так что его можно опустить. */}
          <div className="flex rounded-full border border-line bg-offwhite p-1">
            <button
              type="button"
              onClick={() => onChange({ ...form, mode: "existing" })}
              className={pillButtonClass(form.mode === "existing")}
            >
              <CompactLabel short="Существующее" full="Существующее упражнение" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...form, mode: "new" })}
              className={pillButtonClass(form.mode === "new")}
            >
              <CompactLabel short="Новое" full="Новое упражнение" />
            </button>
          </div>

          {form.mode === "existing" ? (
            <>
              <Combobox
                required
                placeholder="Упражнение"
                value={form.exerciseId}
                onChange={(exerciseId) => onChange({ ...form, exerciseId })}
                options={catalog.map((ex) => ({ value: String(ex.id), label: ex.name }))}
              />
              <input
                placeholder={catalog.find((ex) => String(ex.id) === form.exerciseId)?.description || "Комментарий"}
                value={form.notes}
                onChange={(e) => onChange({ ...form, notes: e.target.value })}
                className={fieldClass}
              />
            </>
          ) : (
            <>
              <input
                required
                placeholder="Название упражнения"
                value={form.newExerciseName}
                onChange={(e) => onChange({ ...form, newExerciseName: e.target.value })}
                aria-invalid={duplicateName}
                className={`${fieldClass} ${duplicateName ? "!border-coral" : ""}`}
              />
              {duplicateName && <p className="px-4 text-xs text-coral">{DUPLICATE_EXERCISE_MESSAGE}</p>}
              <input
                placeholder="Комментарий"
                value={form.newExerciseDescription}
                onChange={(e) => onChange({ ...form, newExerciseDescription: e.target.value })}
                className={fieldClass}
              />
              <ExerciseMediaFields
                media={{ imageUrl: form.newExerciseImageUrl, videoUrl: form.newExerciseVideoUrl }}
                onChange={(media) =>
                  onChange({ ...form, newExerciseImageUrl: media.imageUrl, newExerciseVideoUrl: media.videoUrl })
                }
                onUploadError={onUploadError}
              />
            </>
          )}

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || duplicateName}
            className="w-full !normal-case !text-base disabled:!bg-ink/10 disabled:!text-ink/40 disabled:!opacity-100"
          >
            {submitting ? "Сохраняем..." : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
