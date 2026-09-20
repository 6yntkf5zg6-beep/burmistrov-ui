import type { FormEvent } from "react";
import { Button } from "../../../components/Button";
import { useModal } from "../../../hooks/useModal";

export interface WorkoutFormState {
  name: string;
  description: string;
}

const fieldClass =
  "w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";
const textareaClass =
  "w-full resize-none rounded-2xl border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";

interface Props {
  title: string;
  form: WorkoutFormState;
  onChange: (form: WorkoutFormState) => void;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function WorkoutFormModal({
  title,
  form,
  onChange,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onClose,
}: Props) {
  useModal(onClose);

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
            placeholder="Название тренировки"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            className={fieldClass}
          />
          <textarea
            placeholder="Описание"
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            className={textareaClass}
          />

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full !normal-case !text-base">
            {submitting ? "Сохраняем..." : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
