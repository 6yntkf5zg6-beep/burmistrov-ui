import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { workoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { WorkoutResponse } from "../../../api/types";
import { ActionsMenu } from "../../../components/ActionsMenu";
import { PreviewList } from "../../../components/PreviewList";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { WorkoutFormModal, type WorkoutFormState } from "./WorkoutFormModal";

const emptyForm: WorkoutFormState = { name: "", description: "" };

export function WorkoutsSection() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<WorkoutFormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WorkoutFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    workoutApi.list().then(setWorkouts).catch((e) => setError(apiErrorMessage(e)));
  }

  useEffect(reload, []);

  async function createWorkout(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const workout = await workoutApi.create({
        name: createForm.name,
        description: createForm.description || undefined,
      });
      setWorkouts((prev) => [workout, ...prev]);
      setCreateForm(emptyForm);
      setCreateOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось создать тренировку"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(workout: WorkoutResponse) {
    setError(null);
    setEditingId(workout.id);
    setEditForm({ name: workout.name, description: workout.description ?? "" });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await workoutApi.update(editingId, {
        name: editForm.name,
        description: editForm.description || undefined,
      });
      setWorkouts((prev) => prev.map((w) => (w.id === editingId ? updated : w)));
      setEditingId(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить тренировку"));
    } finally {
      setSaving(false);
    }
  }

  async function removeWorkout(workout: WorkoutResponse) {
    if (!window.confirm(`Удалить тренировку «${workout.name}»?`)) return;
    setError(null);
    try {
      await workoutApi.remove(workout.id);
      setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось удалить тренировку"));
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче, иначе
          пара «заголовок + кнопка» не помещалась в ширину карточки. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Тренировки</h2>
        <Button
          variant="neutral"
          onClick={() => {
            setError(null);
            setCreateForm(emptyForm);
            setCreateOpen(true);
          }}
          className="!px-5 !py-2.5 !text-xs shrink-0"
        >
          <CompactLabel short="Создать" full="Создать тренировку" />
        </Button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Тренировка — это список упражнений, не привязанный к комплексу или клиенту: готовый набор, который можно
        переиспользовать.
      </p>

      {error && !createOpen && editingId === null && <p className="mt-2 text-sm text-coral">{error}</p>}

      {workouts.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">Тренировок ещё не создано.</p>
      ) : (
        <PreviewList
          items={workouts}
          modalTitle="Тренировки"
          searchIn={(w) => `${w.name} ${w.description ?? ""}`}
          renderRow={(w) => (
            <li
              key={w.id}
              onClick={() => navigate(`/dashboard/trainer/workouts/${w.id}`)}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl py-3 hover:bg-offwhite"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{w.name}</p>
                {w.description && <p className="text-xs text-ink/50">{w.description}</p>}
              </div>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <ActionsMenu
                  actions={[
                    { label: "Изменить", onClick: () => startEdit(w) },
                    { label: "Удалить", onClick: () => removeWorkout(w), danger: true },
                  ]}
                />
              </div>
            </li>
          )}
        />
      )}

      {createOpen && (
        <WorkoutFormModal
          title="Новая тренировка"
          form={createForm}
          onChange={setCreateForm}
          submitLabel="Создать тренировку"
          submitting={creating}
          error={error}
          onSubmit={createWorkout}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingId !== null && (
        <WorkoutFormModal
          title="Изменить тренировку"
          form={editForm}
          onChange={setEditForm}
          submitLabel="Сохранить"
          submitting={saving}
          error={error}
          onSubmit={saveEdit}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
