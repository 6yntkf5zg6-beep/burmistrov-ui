import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { exerciseApi, workoutApi, workoutExerciseApi } from "../../../api/endpoints";
import { apiErrorMessage, isConflictError } from "../../../api/http";
import type {
  ExerciseResponse,
  WorkoutExerciseRequest,
  WorkoutExerciseResponse,
  WorkoutResponse,
} from "../../../api/types";
import { ActionsMenu } from "../../../components/ActionsMenu";
import { useSortable } from "../../../hooks/useSortable";
import { DUPLICATE_EXERCISE_MESSAGE } from "./exerciseName";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import {
  emptyWorkoutExerciseForm,
  WorkoutExerciseFormModal,
  type WorkoutExerciseFormState,
} from "./WorkoutExerciseFormModal";

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

export function TrainerWorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const id = Number(workoutId);

  const [workout, setWorkout] = useState<WorkoutResponse | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseResponse[]>([]);
  const [catalog, setCatalog] = useState<ExerciseResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<WorkoutExerciseFormState>(emptyWorkoutExerciseForm());
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editExerciseForm, setEditExerciseForm] = useState<WorkoutExerciseFormState>(emptyWorkoutExerciseForm());
  const [savingExercise, setSavingExercise] = useState(false);

  const sortable = useSortable(exercises.length, reorderExercises);

  useEffect(() => {
    workoutApi.get(id).then(setWorkout).catch((e) => setError(apiErrorMessage(e)));
    workoutExerciseApi.list(id).then(setExercises).catch((e) => setError(apiErrorMessage(e)));
    exerciseApi.list().then(setCatalog).catch((e) => setError(apiErrorMessage(e)));
  }, [id]);

  async function addExercise(e: FormEvent) {
    e.preventDefault();
    setAddingExercise(true);
    setError(null);
    try {
      const exerciseId = await resolveExerciseId(exerciseForm, (ex) => setCatalog((prev) => [ex, ...prev]));
      const created = await workoutExerciseApi.add(id, {
        ...toExerciseRequest(exerciseForm, exerciseId),
        orderIndex: exercises.length,
      });
      setExercises((prev) => [...prev, created]);
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
      const exerciseId = await resolveExerciseId(editExerciseForm, (ex) => setCatalog((prev) => [ex, ...prev]));
      const updated = await workoutExerciseApi.update(id, editingExerciseId, toExerciseRequest(editExerciseForm, exerciseId));
      setExercises((prev) => prev.map((x) => (x.id === editingExerciseId ? updated : x)));
      setEditingExerciseId(null);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось сохранить упражнение"));
    } finally {
      setSavingExercise(false);
    }
  }

  const [confirmingExercise, setConfirmingExercise] = useState<WorkoutExerciseResponse | null>(null);
  const [removingExercise, setRemovingExercise] = useState(false);

  /** Вызывается уже после подтверждения — само окно живёт в состоянии рядом. */
  async function removeExercise(we: WorkoutExerciseResponse) {
    setRemovingExercise(true);
    setError(null);
    try {
      await workoutExerciseApi.remove(id, we.id);
      setExercises((prev) => prev.filter((x) => x.id !== we.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось убрать упражнение"));
    } finally {
      setRemovingExercise(false);
      setConfirmingExercise(null);
    }
  }

  async function reorderExercises(from: number, to: number) {
    if (from === to) return;
    const reordered = [...exercises];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((we, i) => ({ ...we, orderIndex: i }));
    setExercises(withOrder);
    setError(null);
    try {
      await Promise.all(
        withOrder.map((we) => workoutExerciseApi.update(id, we.id, toReorderRequest(we, we.orderIndex))),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось изменить порядок упражнений"));
      workoutExerciseApi.list(id).then(setExercises).catch(() => {});
    }
  }

  if (!workout) {
    return error ? <p className="text-sm text-coral">{error}</p> : <p className="text-sm text-ink/50">Загрузка...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        {/* На телефоне ссылке нужна своя зона нажатия: одной строки текста мало. */}
        <Link to="/dashboard" className="inline-block py-2 text-sm font-semibold text-primary sm:py-0">
          ← Мои клиенты
        </Link>
        <h1 className="text-2xl font-extrabold text-ink sm:mt-2 sm:text-3xl">{workout.name}</h1>
        {workout.description && <p className="mt-1 text-sm text-ink/60">{workout.description}</p>}
      </div>

      {error && !createExerciseOpen && editingExerciseId === null && <p className="text-sm text-coral">{error}</p>}

      <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
        {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче,
            иначе пара «заголовок + кнопка» не помещалась в ширину карточки. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Упражнения</h2>
          <Button
            type="button"
            variant="neutral"
            onClick={() => {
              setError(null);
              setExerciseForm(emptyWorkoutExerciseForm());
              setCreateExerciseOpen(true);
            }}
            className="!px-5 !py-2.5 !text-xs shrink-0"
          >
            <CompactLabel short="Добавить" full="Добавить упражнение" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink/60">Тренировка состоит из упражнений.</p>

        {exercises.length === 0 ? (
          <p className="mt-4 text-sm text-ink/60">В тренировке пока нет упражнений.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {exercises.map((we, i) => (
              <li
                key={we.id}
                ref={sortable.setItemRef(i)}
                style={sortable.itemStyle(i)}
                className={`rounded-2xl border bg-white p-3 sm:p-4 ${
                  sortable.draggingIndex === i ? "border-primary" : "border-line"
                }`}
              >
                {/* Ручка и меню прижаты к краям строки: без min-w-0 длинное название
                    распирало середину и меню сваливалось на строку ниже. */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      {...sortable.handleProps(i)}
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

      {confirmingExercise && (
        <ConfirmDialog
          title="Убрать упражнение?"
          description={`«${confirmingExercise.exerciseName}» пропадёт из этой тренировки. В каталоге упражнение останется.`}
          confirmLabel="Убрать"
          busy={removingExercise}
          onConfirm={() => removeExercise(confirmingExercise)}
          onCancel={() => setConfirmingExercise(null)}
        />
      )}
    </div>
  );
}
