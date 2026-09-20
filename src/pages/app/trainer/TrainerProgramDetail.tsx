import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { exerciseApi, programWorkoutApi, trainingProgramApi, workoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { ExerciseResponse, TrainingProgramResponse, WorkoutResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { useSortable } from "../../../hooks/useSortable";
import { ProgramWorkoutCard } from "./ProgramWorkoutCard";
import { ProgramWorkoutFormModal } from "./ProgramWorkoutFormModal";

export function TrainerProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const id = Number(programId);

  const [program, setProgram] = useState<TrainingProgramResponse | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutResponse[]>([]);
  const [catalog, setCatalog] = useState<ExerciseResponse[]>([]);
  const [catalogWorkouts, setCatalogWorkouts] = useState<WorkoutResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [sourceWorkoutId, setSourceWorkoutId] = useState("");
  const [creatingWorkout, setCreatingWorkout] = useState(false);

  useEffect(() => {
    trainingProgramApi.get(id).then(setProgram).catch((e) => setError(apiErrorMessage(e)));
    programWorkoutApi.list(id).then(setWorkouts).catch((e) => setError(apiErrorMessage(e)));
    exerciseApi.list().then(setCatalog).catch((e) => setError(apiErrorMessage(e)));
    workoutApi.list().then(setCatalogWorkouts).catch((e) => setError(apiErrorMessage(e)));
  }, [id]);

  const sortable = useSortable(workouts.length, reorderWorkouts);

  async function reorderWorkouts(from: number, to: number) {
    const reordered = [...workouts];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((w, i) => ({ ...w, orderIndex: i }));
    setWorkouts(withOrder);

    setError(null);
    try {
      await Promise.all(
        withOrder.map((w) =>
          programWorkoutApi.update(id, w.id, {
            name: w.name,
            description: w.description || undefined,
            orderIndex: w.orderIndex,
          }),
        ),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось изменить порядок тренировок"));
      programWorkoutApi.list(id).then(setWorkouts).catch(() => {});
    }
  }

  async function createWorkout(e: FormEvent) {
    e.preventDefault();
    setCreatingWorkout(true);
    setError(null);
    try {
      const workout = await programWorkoutApi.create(id, {
        name: workoutName,
        description: workoutDescription || undefined,
        orderIndex: workouts.length,
        sourceWorkoutId: sourceWorkoutId ? Number(sourceWorkoutId) : undefined,
      });
      setWorkouts((prev) => [...prev, workout]);
      setWorkoutName("");
      setWorkoutDescription("");
      setSourceWorkoutId("");
      setCreateOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось создать тренировку"));
    } finally {
      setCreatingWorkout(false);
    }
  }

  if (!program) {
    return error ? <p className="text-sm text-coral">{error}</p> : <p className="text-sm text-ink/50">Загрузка...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        {/* На телефоне ссылке нужна своя зона нажатия: одной строки текста мало. */}
        <Link to="/dashboard" className="inline-block py-2 text-sm font-semibold text-primary sm:py-0">
          ← Мои клиенты
        </Link>
        <h1 className="text-2xl font-extrabold text-ink sm:mt-2 sm:text-3xl">{program.name}</h1>
        {program.description && <p className="mt-1 text-sm text-ink/60">{program.description}</p>}
      </div>

      {error && !createOpen && <p className="text-sm text-coral">{error}</p>}

      <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
        {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче,
            иначе пара «заголовок + кнопка» не помещалась в ширину карточки. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Тренировки</h2>
          <Button
            variant="neutral"
            onClick={() => {
              setError(null);
              setWorkoutName("");
              setWorkoutDescription("");
              setSourceWorkoutId("");
              setCreateOpen(true);
            }}
            className="!px-5 !py-2.5 !text-xs shrink-0"
          >
            <CompactLabel short="Добавить" full="Добавить тренировку" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Комплекс состоит из тренировок без привязки к датам и клиенту, а каждая тренировка — из набора
          упражнений.
        </p>

        <div className="mt-5 space-y-3">
          {workouts.length === 0 ? (
            <p className="text-sm text-ink/60">В комплексе пока нет тренировок.</p>
          ) : (
            workouts.map((w, i) => (
              <ProgramWorkoutCard
                key={w.id}
                programId={id}
                workout={w}
                catalog={catalog}
                onExerciseCreated={(ex) => setCatalog((prev) => [ex, ...prev])}
                onUpdated={(updated) => setWorkouts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                onDeleted={(workoutId) => setWorkouts((prev) => prev.filter((x) => x.id !== workoutId))}
                sortableItemRef={sortable.setItemRef(i)}
                sortableItemStyle={sortable.itemStyle(i)}
                sortableHandleProps={sortable.handleProps(i)}
                isDragging={sortable.draggingIndex === i}
              />
            ))
          )}
        </div>
      </div>

      {createOpen && (
        <ProgramWorkoutFormModal
          title="Новая тренировка"
          name={workoutName}
          onChange={setWorkoutName}
          description={workoutDescription}
          onDescriptionChange={setWorkoutDescription}
          catalogWorkouts={catalogWorkouts}
          sourceWorkoutId={sourceWorkoutId}
          onSourceWorkoutChange={setSourceWorkoutId}
          submitLabel="Добавить тренировку"
          submitting={creatingWorkout}
          error={error}
          onSubmit={createWorkout}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
