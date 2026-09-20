import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { clientWorkoutApi } from "../../../api/endpoints";
import { apiErrorMessage, isForbiddenError } from "../../../api/http";
import type { ClientWorkoutResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { ExerciseMedia } from "../../../components/ExerciseMedia";
import { fromISODate } from "../trainer/calendarDates";

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

/** Сколько осталось до конца окна, в виде «2:41:07». Пусто, если окно уже истекло. */
function formatLeft(msLeft: number): string {
  if (msLeft <= 0) return "";
  const total = Math.floor(msLeft / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Открытая тренировка клиента — отдельная страница, а не окно поверх списка.
 *
 * Страница сама ходит за содержимым, поэтому её можно открыть по ссылке и обновить
 * в браузере: сервер всё равно отдаёт тренировку только внутри живого окна доступа.
 * Когда три часа выходят, показываем это прямо здесь и не делаем вид, что данные ещё живы.
 */
export function ClientWorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const id = Number(workoutId);

  const [workout, setWorkout] = useState<ClientWorkoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Окно закрылось: либо часы досчитали, либо сервер ответил 403 на чтение.
  const [expired, setExpired] = useState(false);

  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkout(await clientWorkoutApi.read(id));
      setNow(Date.now());
      setError(null);
    } catch (e) {
      setWorkout(null);
      // Текст 403 от сервера технический и на английском — клиенту он ничего не объясняет.
      if (isForbiddenError(e)) setExpired(true);
      else setError(apiErrorMessage(e, "Тренировка недоступна"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Тикаем только когда есть что отсчитывать.
  const expiresAt = workout?.expiresAt ? new Date(workout.expiresAt).getTime() : null;
  useEffect(() => {
    if (expiresAt == null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  // Часы устройства ничего не решают: как только они говорят «время вышло»,
  // убираем содержимое — дальше всё равно решит сервер.
  useEffect(() => {
    if (expiresAt == null || now < expiresAt || expired) return;
    setExpired(true);
    setWorkout(null);
  }, [expiresAt, now, expired]);

  /** Пустой текст стирает комментарий: отдельной кнопки «удалить» для этого не нужно. */
  async function sendComment(exerciseUid: string) {
    if (!workout) return;
    setSendingComment(true);
    try {
      const saved = await clientWorkoutApi.comment(workout.id, exerciseUid, commentText);
      const rest = workout.comments.filter((c) => c.exerciseUid !== exerciseUid);
      setWorkout({ ...workout, comments: saved ? [...rest, saved] : rest });
      setCommentText("");
      setCommentFor(null);
    } catch (e) {
      setError(apiErrorMessage(e, "Не удалось отправить комментарий"));
    } finally {
      setSendingComment(false);
    }
  }

  const msLeft = expiresAt != null ? expiresAt - now : 0;

  // На телефоне ссылке нужна своя зона нажатия: одной строки текста мало.
  const back = (
    <Link to="/dashboard" className="inline-block py-2 text-sm font-semibold text-primary sm:py-0">
      ← Мои тренировки
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {back}
        <p className="text-sm text-ink/50">Загрузка...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="space-y-6">
        <div>
          {back}
          <h1 className="text-2xl font-extrabold text-ink sm:mt-2 sm:text-3xl">Тренировка закрыта</h1>
        </div>
        <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
          <p className="text-sm text-ink/70">
            {expired
              ? "Три часа вышли — тренировка закрыта. Если нужно открыть её заново, попросите тренера."
              : (error ?? "Тренировка недоступна.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        {back}
        <h1 className="text-2xl font-extrabold text-ink sm:mt-2 sm:text-3xl">{workout.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/60">
          <span>{dayMonth.format(fromISODate(workout.scheduledDate))}</span>
          {msLeft > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
              осталось {formatLeft(msLeft)}
            </span>
          )}
        </p>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-bold text-ink">Упражнения</h2>
        <p className="mt-1 text-sm text-ink/60">
          Веса и повторения проставил тренер. К каждому упражнению можно оставить комментарий — он
          виден тренеру.
        </p>

        <div className="mt-4 space-y-2">
          {workout.workout.exercises.map((exercise, index) => {
            const uid = exercise.uid ?? String(index);
            const comment = workout.comments.find((c) => c.exerciseUid === uid);
            return (
              <div key={uid} className="rounded-2xl border border-line px-3 py-3 sm:px-4">
                {/* Узкий экран: подходы уезжают под название, иначе на него
                    остаётся полторы буквы. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 font-semibold text-ink sm:truncate">{exercise.name}</p>
                    <ExerciseMedia imageUrl={exercise.imageUrl} videoUrl={exercise.videoUrl} />
                  </span>
                  {exercise.sets.length === 0 ? (
                    <span className="shrink-0 text-xs text-ink/40">без подходов</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {exercise.sets.map((set, setIndex) => (
                        <span
                          key={setIndex}
                          className="rounded-full bg-offwhite px-2.5 py-1 text-xs text-ink/70"
                          title={`Подход ${setIndex + 1}: вес × повторения`}
                        >
                          {set.weightKg != null ? `${set.weightKg}кг` : "—"} × {set.reps ?? "—"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {exercise.notes && <p className="mt-1 text-xs text-ink/50">{exercise.notes}</p>}

                {commentFor === uid ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendComment(uid);
                        if (e.key === "Escape") setCommentFor(null);
                      }}
                      placeholder="Как прошло упражнение"
                      className="min-w-0 flex-1 rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <Button
                      type="button"
                      onClick={() => sendComment(uid)}
                      disabled={sendingComment}
                      className="!px-4 !py-2 !text-xs"
                    >
                      Сохранить
                    </Button>
                    {/* Нажал по ошибке — есть чем передумать. */}
                    <button
                      type="button"
                      onClick={() => setCommentFor(null)}
                      aria-label="Не сохранять"
                      className="shrink-0 px-1 text-ink/30 hover:text-ink/60"
                    >
                      ✕
                    </button>
                  </div>
                ) : comment ? (
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-offwhite px-3 py-2">
                    <p className="min-w-0 flex-1 text-xs text-ink/70">{comment.text}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCommentFor(uid);
                        setCommentText(comment.text);
                      }}
                      className="shrink-0 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCommentFor(uid);
                      setCommentText("");
                    }}
                    className="mt-2 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
                  >
                    Оставить комментарий
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
