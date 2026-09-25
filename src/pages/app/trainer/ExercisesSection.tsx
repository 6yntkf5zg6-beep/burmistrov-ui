import { useEffect, useState, type FormEvent } from "react";
import { exerciseApi } from "../../../api/endpoints";
import { apiErrorMessage, isConflictError } from "../../../api/http";
import { useAuth } from "../../../auth/AuthContext";
import type { ExerciseRequest, ExerciseResponse } from "../../../api/types";
import { ActionsMenu } from "../../../components/ActionsMenu";
import { PreviewList } from "../../../components/PreviewList";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ExerciseFormModal, type ExerciseFormState } from "./ExerciseFormModal";
import { DUPLICATE_EXERCISE_MESSAGE } from "./exerciseName";

const emptyForm: ExerciseFormState = { name: "", description: "", imageUrl: "", videoUrl: "" };

function toRequest(form: ExerciseFormState): ExerciseRequest {
  return {
    name: form.name,
    description: form.description || undefined,
    imageUrl: form.imageUrl || undefined,
    videoUrl: form.videoUrl || undefined,
  };
}

export function ExercisesSection() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExerciseResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState<ExerciseResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ExerciseFormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExerciseFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    exerciseApi.list().then(setExercises).catch((e) => setError(apiErrorMessage(e)));
  }

  useEffect(reload, []);

  async function createExercise(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const exercise = await exerciseApi.create(toRequest(createForm));
      setExercises((prev) => [exercise, ...prev]);
      setCreateForm(emptyForm);
      setCreateOpen(false);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось создать упражнение"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(ex: ExerciseResponse) {
    setError(null);
    setEditingId(ex.id);
    setEditForm({
      name: ex.name,
      description: ex.description ?? "",
      imageUrl: ex.imageUrl ?? "",
      videoUrl: ex.videoUrl ?? "",
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await exerciseApi.update(editingId, toRequest(editForm));
      setExercises((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
      setEditingId(null);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось сохранить упражнение"));
    } finally {
      setSaving(false);
    }
  }

  /** Вызывается уже после подтверждения — само окно живёт в состоянии рядом. */
  async function removeExercise(ex: ExerciseResponse) {
    setDeleting(true);
    setError(null);
    try {
      await exerciseApi.remove(ex.id);
      setExercises((prev) => prev.filter((x) => x.id !== ex.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось удалить упражнение — возможно, оно уже используется в тренировке"));
    } finally {
      setDeleting(false);
      setConfirmingDelete(null);
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче, иначе
          пара «заголовок + кнопка» не помещалась в ширину карточки. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Упражнения</h2>
        <Button
          variant="neutral"
          onClick={() => {
            setError(null);
            setCreateForm(emptyForm);
            setCreateOpen(true);
          }}
          className="!px-5 !py-2.5 !text-xs shrink-0"
        >
          <CompactLabel short="Создать" full="Добавить упражнение" />
        </Button>
      </div>

      {error && !createOpen && editingId === null && <p className="mt-2 text-sm text-coral">{error}</p>}

      {exercises.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">Упражнений пока нет.</p>
      ) : (
        <PreviewList
          items={exercises}
          modalTitle="Упражнения"
          searchIn={(ex) => `${ex.name} ${ex.description ?? ""}`}
          renderRow={(ex) => (
            <li key={ex.id} className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{ex.name}</p>
                <p className="text-xs text-ink/50">{ex.description || "Без комментария"}</p>
              </div>
              {ex.createdBy === user?.id ? (
                <ActionsMenu
                  actions={[
                    { label: "Изменить", onClick: () => startEdit(ex) },
                    { label: "Удалить", onClick: () => setConfirmingDelete(ex), danger: true },
                  ]}
                />
              ) : (
                <span className="shrink-0 text-xs uppercase text-ink/40">Общее</span>
              )}
            </li>
          )}
        />
      )}

      {createOpen && (
        <ExerciseFormModal
          title="Новое упражнение"
          form={createForm}
          onChange={setCreateForm}
          submitLabel="Добавить упражнение"
          submitting={creating}
          error={error}
          existingNames={exercises.map((ex) => ex.name)}
          onUploadError={setError}
          onSubmit={createExercise}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingId !== null && (
        <ExerciseFormModal
          title="Изменить упражнение"
          form={editForm}
          onChange={setEditForm}
          submitLabel="Сохранить"
          submitting={saving}
          error={error}
          existingNames={exercises.filter((ex) => ex.id !== editingId).map((ex) => ex.name)}
          onUploadError={setError}
          onSubmit={saveEdit}
          onClose={() => setEditingId(null)}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Удалить упражнение?"
          description={`«${confirmingDelete.name}» исчезнет из каталога. Если оно уже стоит в какой-нибудь тренировке, удалить не получится.`}
          busy={deleting}
          onConfirm={() => removeExercise(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
        />
      )}
    </div>
  );
}
