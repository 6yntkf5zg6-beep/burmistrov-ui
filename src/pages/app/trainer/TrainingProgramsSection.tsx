import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { trainingProgramApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { TrainingProgramResponse } from "../../../api/types";
import { ActionsMenu } from "../../../components/ActionsMenu";
import { PreviewList } from "../../../components/PreviewList";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { TrainingProgramFormModal, type TrainingProgramFormState } from "./TrainingProgramFormModal";

const emptyForm: TrainingProgramFormState = { name: "", description: "" };

/*
 * В интерфейсе это «комплекс», в коде и в API — program. Переименовали только подписи:
 * трогать ради слова эндпоинты, таблицы и типы дороже, чем держать это соответствие в уме.
 */

export function TrainingProgramsSection() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<TrainingProgramResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TrainingProgramFormState>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TrainingProgramFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    trainingProgramApi.list().then(setPrograms).catch((e) => setError(apiErrorMessage(e)));
  }

  useEffect(reload, []);

  async function createProgram(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const program = await trainingProgramApi.create({
        name: createForm.name,
        description: createForm.description || undefined,
      });
      setPrograms((prev) => [program, ...prev]);
      setCreateForm(emptyForm);
      setCreateOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось создать комплекс"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(program: TrainingProgramResponse) {
    setError(null);
    setEditingId(program.id);
    setEditForm({ name: program.name, description: program.description ?? "" });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await trainingProgramApi.update(editingId, {
        name: editForm.name,
        description: editForm.description || undefined,
      });
      setPrograms((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      setEditingId(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить комплекс"));
    } finally {
      setSaving(false);
    }
  }

  async function removeProgram(program: TrainingProgramResponse) {
    if (!window.confirm(`Удалить комплекс «${program.name}» вместе со всеми его тренировками?`)) return;
    setError(null);
    try {
      await trainingProgramApi.remove(program.id);
      setPrograms((prev) => prev.filter((p) => p.id !== program.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось удалить комплекс"));
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче, иначе
          пара «заголовок + кнопка» не помещалась в ширину карточки. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Комплексы</h2>
        <Button
          variant="neutral"
          onClick={() => {
            setError(null);
            setCreateForm(emptyForm);
            setCreateOpen(true);
          }}
          className="!px-5 !py-2.5 !text-xs shrink-0"
        >
          <CompactLabel short="Создать" full="Создать комплекс" />
        </Button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Комплекс — это список тренировок без дат и без привязки к клиенту: готовый шаблон, который можно
        переиспользовать.
      </p>

      {error && !createOpen && editingId === null && <p className="mt-2 text-sm text-coral">{error}</p>}

      {programs.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">Комплексов ещё не создано.</p>
      ) : (
        <PreviewList
          items={programs}
          modalTitle="Комплексы"
          searchIn={(p) => `${p.name} ${p.description ?? ""}`}
          renderRow={(p) => (
            <li
              key={p.id}
              onClick={() => navigate(`/dashboard/trainer/programs/${p.id}`)}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl py-3 hover:bg-offwhite"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{p.name}</p>
                {p.description && <p className="text-xs text-ink/50">{p.description}</p>}
              </div>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <ActionsMenu
                  actions={[
                    { label: "Изменить", onClick: () => startEdit(p) },
                    { label: "Удалить", onClick: () => removeProgram(p), danger: true },
                  ]}
                />
              </div>
            </li>
          )}
        />
      )}

      {createOpen && (
        <TrainingProgramFormModal
          title="Новый комплекс"
          form={createForm}
          onChange={setCreateForm}
          submitLabel="Создать комплекс"
          submitting={creating}
          error={error}
          onSubmit={createProgram}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingId !== null && (
        <TrainingProgramFormModal
          title="Изменить комплекс"
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
