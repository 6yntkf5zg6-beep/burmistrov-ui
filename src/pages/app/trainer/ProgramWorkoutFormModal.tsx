import { useState, type FormEvent } from "react";
import type { WorkoutResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { Combobox } from "../../../components/Combobox";
import { useModal } from "../../../hooks/useModal";

const fieldClass =
  "w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";
const textareaClass =
  "w-full resize-none rounded-2xl border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";

type Mode = "manual" | "template";

interface Props {
  title: string;
  name: string;
  onChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  /** Standalone workouts from the catalog, offered as a starting point to copy. */
  catalogWorkouts: WorkoutResponse[];
  sourceWorkoutId: string;
  onSourceWorkoutChange: (sourceWorkoutId: string) => void;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function ProgramWorkoutFormModal({
  title,
  name,
  onChange,
  description,
  onDescriptionChange,
  catalogWorkouts,
  sourceWorkoutId,
  onSourceWorkoutChange,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("manual");

  useModal(onClose);

  function switchToManual() {
    setMode("manual");
    onSourceWorkoutChange("");
  }

  function switchToTemplate() {
    setMode("template");
    onDescriptionChange("");
  }

  function handleSourceSelect(value: string) {
    onSourceWorkoutChange(value);
    const source = catalogWorkouts.find((w) => String(w.id) === value);
    onChange(source?.name ?? "");
    onDescriptionChange(source?.description ?? "");
  }

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
          {catalogWorkouts.length > 0 && (
            <div className="flex rounded-full border border-line bg-offwhite p-1">
              <button
                type="button"
                onClick={switchToManual}
                className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wide transition ${
                  mode === "manual" ? "bg-primary text-white" : "text-ink/50 hover:text-ink"
                }`}
              >
                Новая тренировка
              </button>
              <button
                type="button"
                onClick={switchToTemplate}
                className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wide transition ${
                  mode === "template" ? "bg-primary text-white" : "text-ink/50 hover:text-ink"
                }`}
              >
                Тренировка из списка
              </button>
            </div>
          )}

          {mode === "manual" ? (
            <>
              <input
                required
                placeholder="Название тренировки"
                value={name}
                onChange={(e) => onChange(e.target.value)}
                className={fieldClass}
              />
              <textarea
                placeholder="Описание"
                rows={3}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className={textareaClass}
              />
            </>
          ) : (
            <>
              <Combobox
                required
                placeholder="Тренировка"
                value={sourceWorkoutId}
                onChange={handleSourceSelect}
                options={catalogWorkouts.map((w) => ({ value: String(w.id), label: w.name }))}
              />
              <p className="text-xs text-ink/50">
                Все упражнения выбранной тренировки будут скопированы сразу при создании.
              </p>
            </>
          )}

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full !normal-case !text-base">
            {submitting ? "Добавляем..." : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
