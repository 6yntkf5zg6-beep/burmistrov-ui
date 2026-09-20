import type { FormEvent } from "react";
import { Button } from "../../../components/Button";
import { ExerciseMediaFields } from "../../../components/ExerciseMediaFields";
import { DUPLICATE_EXERCISE_MESSAGE, isDuplicateExerciseName } from "./exerciseName";
import { useModal } from "../../../hooks/useModal";

export interface ExerciseFormState {
  name: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
}

const fieldClass =
  "w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";
const textareaClass =
  "w-full resize-none rounded-2xl border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";

interface Props {
  title: string;
  form: ExerciseFormState;
  onChange: (form: ExerciseFormState) => void;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  /** Названия уже существующих упражнений — при правке без названия самого упражнения. */
  existingNames: string[];
  onUploadError: (message: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function ExerciseFormModal({
  title,
  form,
  onChange,
  submitLabel,
  submitting,
  error,
  existingNames,
  onUploadError,
  onSubmit,
  onClose,
}: Props) {
  useModal(onClose);

  const duplicateName = isDuplicateExerciseName(form.name, existingNames);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-3 py-6 sm:px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-card bg-white p-5 shadow-card sm:p-8"
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
          <input
            required
            placeholder="Название"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            aria-invalid={duplicateName}
            className={`${fieldClass} ${duplicateName ? "!border-coral" : ""}`}
          />
          {duplicateName && <p className="px-4 text-xs text-coral">{DUPLICATE_EXERCISE_MESSAGE}</p>}
          <textarea
            placeholder="Комментарий"
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            className={textareaClass}
          />

          <ExerciseMediaFields
            media={{ imageUrl: form.imageUrl, videoUrl: form.videoUrl }}
            onChange={(media) => onChange({ ...form, imageUrl: media.imageUrl, videoUrl: media.videoUrl })}
            onUploadError={onUploadError}
          />

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
