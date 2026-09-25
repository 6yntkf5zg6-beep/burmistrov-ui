import { useState, type CSSProperties, type FormEvent } from "react";
import { exerciseApi, programWorkoutApi, workoutExerciseApi } from "../../../api/endpoints";
import { apiErrorMessage, isConflictError } from "../../../api/http";
import type {
  ExerciseResponse,
  WorkoutExerciseRequest,
  WorkoutExerciseResponse,
  WorkoutResponse,
} from "../../../api/types";
import { ActionsMenu } from "../../../components/ActionsMenu";
import { DUPLICATE_EXERCISE_MESSAGE } from "./exerciseName";
import { useSortable, type SortableHandleProps } from "../../../hooks/useSortable";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import {
  emptyWorkoutExerciseForm,
  WorkoutExerciseFormModal,
  type WorkoutExerciseFormState,
} from "./WorkoutExerciseFormModal";

const inputClass =
  "min-w-0 flex-1 rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary";

function toExerciseRequest(form: WorkoutExerciseFormState, exerciseId: number): WorkoutExerciseRequest {
  return {
    exerciseId,
    notes: form.notes || undefined,
  };
}

async function resolveExerciseId(
  form: WorkoutExerciseFormState,
  onExerciseCreated: (exercise: ExerciseResponse) => void,
): Promise<number> {
  if (form.mode === "existing") return Number(form.exerciseId);
  // Saved straight into the shared exercise catalog — there is no throwaway "inline" exercise,
  // so it shows up under "Упражнения" and can be reused everywhere afterwards.
  const created = await exerciseApi.create({
    name: form.newExerciseName,
    description: form.newExerciseDescription || undefined,
    imageUrl: form.newExerciseImageUrl || undefined,
    videoUrl: form.newExerciseVideoUrl || undefined,
  });
  onExerciseCreated(created);
  return created.id;
}

function toReorderRequest(we: WorkoutExerciseResponse, orderIndex: number): WorkoutExerciseRequest {
  return {
    exerciseId: we.exerciseId,
    notes: we.notes,
    orderIndex,
  };
}

interface Props {
  programId: number;
  workout: WorkoutResponse;
  catalog: ExerciseResponse[];
  onExerciseCreated: (exercise: ExerciseResponse) => void;
  onUpdated: (workout: WorkoutResponse) => void;
  onDeleted: (workoutId: number) => void;
  /** Перетаскивание карточки внутри программы — списком владеет родитель. */
  sortableItemRef: (element: HTMLElement | null) => void;
  sortableItemStyle: CSSProperties;
  sortableHandleProps: SortableHandleProps;
  isDragging: boolean;
}

export function ProgramWorkoutCard({
  programId,
  workout,
  catalog,
  onExerciseCreated,
  onUpdated,
  onDeleted,
  sortableItemRef,
  sortableItemStyle,
  sortableHandleProps,
  isDragging,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExerciseResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingWorkout, setEditingWorkout] = useState(false);
  const [name, setName] = useState(workout.name);
  const [description, setDescription] = useState(workout.description ?? "");
  const [savingWorkout, setSavingWorkout] = useState(false);

  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<WorkoutExerciseFormState>(emptyWorkoutExerciseForm());
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editExerciseForm, setEditExerciseForm] = useState<WorkoutExerciseFormState>(emptyWorkoutExerciseForm());
  const [savingExercise, setSavingExercise] = useState(false);

  const exerciseSortable = useSortable(exercises?.length ?? 0, reorderExercises);

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && exercises === null) {
      try {
        setExercises(await workoutExerciseApi.list(workout.id));
      } catch (err) {
        setError(apiErrorMessage(err, "Не удалось загрузить упражнения"));
      }
    }
  }

  async function saveWorkout(e: FormEvent) {
    e.preventDefault();
    setSavingWorkout(true);
    setError(null);
    try {
      const updated = await programWorkoutApi.update(programId, workout.id, { name, description: description || undefined });
      onUpdated(updated);
      setEditingWorkout(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить тренировку"));
    } finally {
      setSavingWorkout(false);
    }
  }

  // Две разные операции — два отдельных состояния: одна удаляет тренировку целиком,
  // другая лишь вынимает из неё упражнение.
  const [confirmingWorkout, setConfirmingWorkout] = useState(false);
  const [confirmingExercise, setConfirmingExercise] = useState<WorkoutExerciseResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function removeWorkout() {
    setDeleting(true);
    setError(null);
    try {
      await programWorkoutApi.remove(programId, workout.id);
      onDeleted(workout.id);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось удалить тренировку"));
    } finally {
      setDeleting(false);
      setConfirmingWorkout(false);
    }
  }

  async function addExercise(e: FormEvent) {
    e.preventDefault();
    setAddingExercise(true);
    setError(null);
    try {
      const exerciseId = await resolveExerciseId(exerciseForm, onExerciseCreated);
      const created = await workoutExerciseApi.add(workout.id, {
        ...toExerciseRequest(exerciseForm, exerciseId),
        orderIndex: (exercises ?? []).length,
      });
      setExercises((prev) => [...(prev ?? []), created]);
      setExerciseForm(emptyWorkoutExerciseForm());
      setCreateExerciseOpen(false);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось добавить упражнение"));
    } finally {
      setAddingExercise(false);
    }
  }

  function startEditExercise(we: WorkoutExerciseResponse) {
    setError(null);
    setEditingExerciseId(we.id);
    setEditExerciseForm({
      mode: "existing",
      exerciseId: String(we.exerciseId),
      newExerciseName: "",
      newExerciseDescription: "",
      newExerciseImageUrl: "",
      newExerciseVideoUrl: "",
      notes: we.notes ?? "",
    });
  }

  async function saveExercise(e: FormEvent) {
    e.preventDefault();
    if (editingExerciseId === null) return;
    setSavingExercise(true);
    setError(null);
    try {
      const exerciseId = await resolveExerciseId(editExerciseForm, onExerciseCreated);
      const updated = await workoutExerciseApi.update(
        workout.id,
        editingExerciseId,
        toExerciseRequest(editExerciseForm, exerciseId),
      );
      setExercises((prev) => (prev ?? []).map((x) => (x.id === editingExerciseId ? updated : x)));
      setEditingExerciseId(null);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось сохранить упражнение"));
    } finally {
      setSavingExercise(false);
    }
  }

  async function reorderExercises(from: number, to: number) {
    const list = exercises ?? [];
    if (from === to) return;
    const reordered = [...list];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((we, i) => ({ ...we, orderIndex: i }));
    setExercises(withOrder);
    setError(null);
    try {
      await Promise.all(
        withOrder.map((we) => workoutExerciseApi.update(workout.id, we.id, toReorderRequest(we, we.orderIndex))),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось изменить порядок упражнений"));
      workoutExerciseApi.list(workout.id).then(setExercises).catch(() => {});
    }
  }

  async function removeExercise(we: WorkoutExerciseResponse) {
    setDeleting(true);
    setError(null);
    try {
      await workoutExerciseApi.remove(workout.id, we.id);
      setExercises((prev) => (prev ?? []).filter((x) => x.id !== we.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось убрать упражнение"));
    } finally {
      setDeleting(false);
      setConfirmingExercise(null);
    }
  }

  return (
    <div
      ref={sortableItemRef}
      style={sortableItemStyle}
      className={`rounded-2xl border bg-white p-4 sm:p-5 ${isDragging ? "border-primary" : "border-line"}`}
    >
      {error && !createExerciseOpen && editingExerciseId === null && (
        <p className="mb-3 text-sm text-coral">{error}</p>
      )}

      {editingWorkout ? (
        <form onSubmit={saveWorkout} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input
            placeholder="Заметка"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
          <Button type="submit" disabled={savingWorkout} className="!px-4 !py-2 !text-xs shrink-0">
            Сохранить
          </Button>
          <button
            type="button"
            onClick={() => setEditingWorkout(false)}
            className="shrink-0 text-xs font-bold uppercase text-ink/50 hover:text-ink"
          >
            Отмена
          </button>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
            <span
              {...sortableHandleProps}
              title="Перетащите, чтобы изменить порядок тренировок"
              aria-label="Изменить порядок"
              className="grid h-8 w-8 shrink-0 cursor-grab select-none place-items-center rounded-full text-ink/35 hover:bg-offwhite hover:text-ink/60 active:cursor-grabbing"
            >
              ≡
            </span>
            {/* Заметка уходит под название: приписанная сбоку, она на телефоне
                разрывала строку прямо посреди названия. */}
            <button type="button" onClick={toggleExpanded} className="min-w-0 py-1 text-left sm:py-0">
              <span className="font-semibold text-ink">{workout.name}</span>
              {workout.description && (
                <span className="block text-xs text-ink/50 sm:ml-2 sm:inline">{workout.description}</span>
              )}
            </button>
          </div>
          <ActionsMenu
            actions={[
              { label: "Изменить", onClick: () => setEditingWorkout(true) },
              { label: "Удалить", onClick: () => setConfirmingWorkout(true), danger: true },
            ]}
          />
        </div>
      )}

      {expanded && (
        <div className="mt-4 border-t border-line pt-4">
          {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче,
              иначе пара «заголовок + кнопка» не помещалась в ширину карточки. */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-ink">Упражнения</h3>
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setError(null);
                setExerciseForm(emptyWorkoutExerciseForm());
                setCreateExerciseOpen(true);
              }}
              className="!px-4 !py-2 !text-xs shrink-0"
            >
              <CompactLabel short="Добавить" full="Добавить упражнение" />
            </Button>
          </div>

          {exercises === null ? (
            <p className="mt-3 text-sm text-ink/50">Загрузка...</p>
          ) : exercises.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">В тренировке пока нет упражнений.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {exercises.map((we, i) => (
                <li
                  key={we.id}
                  ref={exerciseSortable.setItemRef(i)}
                  style={exerciseSortable.itemStyle(i)}
                  className={`rounded-2xl border bg-white p-3 sm:p-4 ${
                    exerciseSortable.draggingIndex === i ? "border-primary" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span
                        {...exerciseSortable.handleProps(i)}
                        title="Перетащите, чтобы изменить порядок упражнений"
                        aria-label="Изменить порядок"
                        className="grid h-8 w-8 shrink-0 cursor-grab select-none place-items-center rounded-full text-ink/35 hover:bg-offwhite hover:text-ink/60 active:cursor-grabbing sm:h-7 sm:w-7"
                      >
                        ≡
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{we.exerciseName}</p>
                        {(we.notes || we.exerciseDescription) && (
                          <p className="text-xs text-ink/50">{we.notes || we.exerciseDescription}</p>
                        )}
                      </div>
                    </div>
                    <ActionsMenu
                      actions={[
                        { label: "Изменить", onClick: () => startEditExercise(we) },
                        { label: "Удалить", onClick: () => setConfirmingExercise(we), danger: true },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {createExerciseOpen && (
        <WorkoutExerciseFormModal
          title="Упражнение в тренировке"
          catalog={catalog}
          form={exerciseForm}
          onChange={setExerciseForm}
          submitLabel="Добавить упражнение"
          submitting={addingExercise}
          error={error}
          onUploadError={setError}
          onSubmit={addExercise}
          onClose={() => setCreateExerciseOpen(false)}
        />
      )}

      {editingExerciseId !== null && (
        <WorkoutExerciseFormModal
          title="Изменить упражнение"
          catalog={catalog}
          form={editExerciseForm}
          onChange={setEditExerciseForm}
          submitLabel="Сохранить"
          submitting={savingExercise}
          error={error}
          onUploadError={setError}
          onSubmit={saveExercise}
          onClose={() => setEditingExerciseId(null)}
        />
      )}

      {confirmingWorkout && (
        <ConfirmDialog
          title="Удалить тренировку?"
          description={`«${workout.name}» будет удалена из комплекса вместе со всеми упражнениями в ней.`}
          busy={deleting}
          onConfirm={removeWorkout}
          onCancel={() => setConfirmingWorkout(false)}
        />
      )}

      {confirmingExercise && (
        <ConfirmDialog
          title="Убрать упражнение?"
          description={`«${confirmingExercise.exerciseName}» пропадёт из этой тренировки. В каталоге упражнение останется.`}
          confirmLabel="Убрать"
          busy={deleting}
          onConfirm={() => removeExercise(confirmingExercise)}
          onCancel={() => setConfirmingExercise(null)}
        />
      )}
    </div>
  );
}
