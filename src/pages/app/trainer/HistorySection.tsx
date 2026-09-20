import { useEffect, useRef, useState, type ReactNode } from "react";
import { programAssignmentApi, scheduledWorkoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type {
  ProgramAssignmentResponse,
  ProgramAssignmentWorkout,
  ScheduledWorkoutResponse,
} from "../../../api/types";
import { CommentBadge } from "../../../components/CommentBadge";
import { DetailModal } from "../../../components/DetailModal";
import { WorkoutViewModal } from "./WorkoutViewModal";
import { WORKOUT_STATE_LABEL, WORKOUT_STATE_TITLE, workoutChip, workoutState } from "./workoutStatus";

const HISTORY_MONTHS = 3;
/** Сколько строк видно в списке программ до «См. больше». */
const PREVIEW_ROWS = 8;
/** На телефоне столько же строк заняло бы целый экран — там список короче. */
const MOBILE_PREVIEW_ROWS = 3;
/** Запланированные и прошедшие тренировки показываем по три, остальное — в окне. */
const WORKOUT_PREVIEW_ROWS = 3;
/** Кнопка списка появляется, как только в нём есть что разворачивать. */
const MORE_FROM = 1;

const dayMonthShort = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const dayMonthTime = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Что стало с тренировкой назначения:
 * — {@code excluded} тренер убрал её ещё при назначении, в календарь она не попадала;
 * — {@code cancelled} она была назначена, но потом удалена из календаря;
 * — {@code moved} она жива, но стоит на другой дате: тренер её перенёс;
 * — {@code scheduled} стоит там, куда её назначили.
 */
type AssignedState = "scheduled" | "moved" | "cancelled" | "excluded";

/** Ключ, по которому строка расписания сопоставляется с составом назначения. */
function placementKey(workoutId: number, date: string): string {
  return `${workoutId}|${date}`;
}


/**
 * Что происходило с клиентом за последние три месяца: слева тренировки календаря, справа
 * назначенные программы. В любую строку можно провалиться и посмотреть содержимое.
 *
 * История программ читается не из расписания, а из собственной записи о назначении: строки
 * расписания не помнят ни того, что назначались одной программой, ни того, какие тренировки
 * тренер из назначения убрал.
 *
 * @param refreshToken любое новое значение заставляет блок перечитать историю. Календарь
 *        меняет его после правки весов, удаления тренировки и назначения программы.
 */
export function HistorySection({
  clientId,
  refreshToken = 0,
  onEditWorkout,
}: {
  clientId: number;
  refreshToken?: number;
  /** Просьба открыть обычное окно правки дня — оно живёт в календаре выше. */
  onEditWorkout?: (scheduledWorkoutId: number) => void;
}) {
  const [assignments, setAssignments] = useState<ProgramAssignmentResponse[]>([]);
  const [workouts, setWorkouts] = useState<ScheduledWorkoutResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState<"upcoming" | "past" | "programs" | null>(null);
  const [openProgram, setOpenProgram] = useState<ProgramAssignmentResponse | null>(null);
  const [openWorkout, setOpenWorkout] = useState<ScheduledWorkoutResponse | null>(null);

  // Заставку показываем только когда показывать больше нечего: обновление после действия
  // в календаре должно быть незаметным, а не мигать «Загрузка...».
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (loadedFor.current !== clientId) {
      setLoading(true);
    }
    setError(null);

    Promise.all([
      programAssignmentApi.listForClient(clientId, HISTORY_MONTHS),
      scheduledWorkoutApi.listForClient(clientId),
    ])
      .then(([assignmentList, workoutList]) => {
        if (cancelled) return;
        setAssignments(assignmentList);
        setWorkouts(workoutList);
      })
      .catch((e) => {
        if (!cancelled) setError(apiErrorMessage(e, "Не удалось загрузить историю"));
      })
      .finally(() => {
        if (cancelled) return;
        loadedFor.current = clientId;
        setLoading(false);
      });

    // Ответ на устаревший запрос игнорируем — иначе два быстрых действия подряд
    // могут разложиться в обратном порядке.
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshToken]);

  const since = new Date();
  since.setMonth(since.getMonth() - HISTORY_MONTHS);
  const sinceISO = toISODate(since);

  // Отмену никто не записывает отдельным событием, поэтому сверяем состав назначения с тем,
  // что реально осталось в расписании. Ключ — источник плюс дата.
  const scheduledByKey = new Map(
    workouts
      .filter((sw) => sw.sourceWorkoutId != null)
      .map((sw) => [placementKey(sw.sourceWorkoutId!, sw.scheduledDate), sw] as const),
  );

  // Перенос дня меняет дату, но не тренировку-источник. Без этой карты перенесённая
  // тренировка выглядела бы снятой — на исходной дате её и правда нет.
  const scheduledBySource = new Map(
    workouts.filter((sw) => sw.sourceWorkoutId != null).map((sw) => [sw.sourceWorkoutId!, sw] as const),
  );

  /** Строка расписания, соответствующая тренировке назначения, — где бы она сейчас ни стояла. */
  function scheduledFor(workout: ProgramAssignmentWorkout): ScheduledWorkoutResponse | undefined {
    if (!workout.included || workout.workoutId == null || !workout.date) return undefined;
    return (
      scheduledByKey.get(placementKey(workout.workoutId, workout.date)) ??
      scheduledBySource.get(workout.workoutId)
    );
  }

  function assignedState(workout: ProgramAssignmentWorkout): AssignedState {
    if (!workout.included) return "excluded";
    // Без источника или даты сверять не с чем — не выдумываем отмену.
    if (workout.workoutId == null || !workout.date) return "scheduled";
    if (scheduledByKey.has(placementKey(workout.workoutId, workout.date))) return "scheduled";
    return scheduledBySource.has(workout.workoutId) ? "moved" : "cancelled";
  }

  function assignmentCounts(assignment: ProgramAssignmentResponse) {
    const states = assignment.workouts.map(assignedState);
    return {
      total: assignment.workouts.length,
      // Перенесённая тренировка никуда не делась, просто стоит на другой дате.
      scheduled: states.filter((state) => state === "scheduled" || state === "moved").length,
      moved: states.filter((state) => state === "moved").length,
      cancelled: states.filter((state) => state === "cancelled").length,
      excluded: states.filter((state) => state === "excluded").length,
    };
  }

  // Сегодняшний день считаем запланированным: он ещё не закончился.
  const todayISO = toISODate(new Date());

  const upcomingWorkouts = workouts
    .filter((sw) => sw.scheduledDate >= todayISO)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const pastWorkouts = workouts
    .filter((sw) => sw.scheduledDate < todayISO && sw.scheduledDate >= sinceISO)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  // Если из назначения удалили все тренировки, показывать нечего — прячем программу целиком.
  const visibleAssignments = assignments.filter((assignment) => assignmentCounts(assignment).scheduled > 0);

  const rowClass =
    // На телефоне хвост строки (статус, счётчик) уходит на вторую строку: в одну он
    // ужимал название до пары букв — «Ноги (си...».
    "flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-offwhite px-3 py-2.5 text-left " +
    "transition hover:bg-line/60 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-2";

  /**
   * Программа, из которой эта тренировка попала в календарь. Связь мягкая: ищем назначение,
   * в составе которого есть та же тренировка-источник. Одну программу могли назначать не раз,
   * поэтому при нескольких совпадениях берём то, где сошлась и дата, иначе самое свежее.
   */
  function assignmentFor(sw: ScheduledWorkoutResponse): ProgramAssignmentResponse | undefined {
    if (sw.sourceWorkoutId == null) return undefined;
    const matches = assignments.filter((assignment) =>
      assignment.workouts.some((workout) => workout.included && workout.workoutId === sw.sourceWorkoutId),
    );
    if (matches.length <= 1) return matches[0];
    return (
      matches.find((assignment) =>
        assignment.workouts.some(
          (workout) => workout.workoutId === sw.sourceWorkoutId && workout.date === sw.scheduledDate,
        ),
      ) ?? matches[0]
    );
  }



  function workoutRow(sw: ScheduledWorkoutResponse, withExercises: boolean) {
    const state = workoutState(sw);
    const exercises = sw.workout.exercises.length;
    return (
      <button key={sw.id} type="button" onClick={() => setOpenWorkout(sw)} className={rowClass}>
        <span className="w-16 shrink-0 text-xs font-semibold text-ink/50">
          {dayMonthShort.format(fromISODate(sw.scheduledDate))}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{sw.name}</span>
        {/* Хвост строки — число упражнений, метка комментария и статус — переносится
            целиком: по отдельности они всё равно отъедали у названия половину строки. */}
        <span className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
          {withExercises && (
            <span className="text-xs text-ink/40">
              {exercises} {exercises === 1 ? "упражнение" : "упражнений"}
            </span>
          )}
          <CommentBadge count={sw.comments.length} />
          <span
            title={WORKOUT_STATE_TITLE[state]}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${workoutChip(sw)}`}
          >
            {WORKOUT_STATE_LABEL[state]}
          </span>
        </span>
      </button>
    );
  }

  /**
   * @param hiddenOnMobile строка за пределами телефонной выжимки. Она всё равно
   *        отрисована: прятать её классом дешевле, чем следить за шириной экрана из
   *        JavaScript и перерисовывать список на каждый поворот телефона.
   */
  function programRow(assignment: ProgramAssignmentResponse, hiddenOnMobile = false) {
    const counts = assignmentCounts(assignment);
    return (
      <button
        key={assignment.id}
        type="button"
        onClick={() => setOpenProgram(assignment)}
        className={`${rowClass}${hiddenOnMobile ? " max-sm:hidden" : ""}`}
      >
        <span className="w-16 shrink-0 text-xs font-semibold text-ink/50">
          {dayMonthShort.format(new Date(assignment.assignedAt))}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{assignment.programName}</span>
        <span className="shrink-0 text-xs text-ink/40 max-sm:w-full max-sm:text-right">
          {counts.scheduled} из {counts.total}
          {counts.moved > 0 && ` · ${counts.moved} перенесена`}
          {counts.excluded > 0 && ` · ${counts.excluded} убрана`}
          {counts.cancelled > 0 && ` · ${counts.cancelled} снята`}
        </span>
      </button>
    );
  }

  /**
   * Состав назначения: что стоит в календаре, что тренер убрал при назначении и что снял
   * позже. Тренировки, которые ещё в календаре, открываются по клику.
   */
  function programBody(assignment: ProgramAssignmentResponse) {
    const counts = assignmentCounts(assignment);
    return (
      <>
        <p className="text-xs text-ink/50">
          {counts.scheduled} из {counts.total} тренировок в календаре
          {counts.moved > 0 && `, ${counts.moved} перенесено`}
          {counts.excluded > 0 && `, ${counts.excluded} убрано при назначении`}
          {counts.cancelled > 0 && `, ${counts.cancelled} снято позже`}
        </p>
        <ul className="mt-3 space-y-1">
          {assignment.workouts.map((workout, index) => {
            const state = assignedState(workout);
            const scheduled = scheduledFor(workout);
            const dot =
              state === "scheduled"
                ? "bg-primary"
                : state === "moved"
                  ? "bg-primary/40"
                  : state === "cancelled"
                    ? "bg-coral/70"
                    : "bg-ink/25";
            const name =
              state === "scheduled" || state === "moved"
                ? "text-ink"
                : state === "cancelled"
                  ? "text-ink/60"
                  : "text-ink/40 line-through";

            const content = (
              <>
                <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <span className={`min-w-0 flex-1 truncate ${name}`}>{workout.name}</span>
                <span
                  className={`shrink-0 text-xs ${state === "cancelled" ? "text-coral" : "text-ink/50"}`}
                  title={
                    state === "cancelled"
                      ? `Была назначена на ${workout.date ? dayMonth.format(fromISODate(workout.date)) : "эту дату"}, потом удалена из календаря`
                      : state === "moved" && workout.date
                        ? `Назначалась на ${dayMonth.format(fromISODate(workout.date))}, перенесена`
                        : undefined
                  }
                >
                  {state === "scheduled" && workout.date
                    ? dayMonth.format(fromISODate(workout.date))
                    : state === "moved" && scheduled
                      ? `перенесена на ${dayMonth.format(fromISODate(scheduled.scheduledDate))}`
                      : state === "cancelled"
                        ? "снята"
                        : "убрана"}
                </span>
              </>
            );

            return (
              <li key={`${workout.workoutId ?? index}-${index}`}>
                {scheduled ? (
                  <button
                    type="button"
                    onClick={() => setOpenWorkout(scheduled)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left text-sm transition hover:bg-offwhite"
                  >
                    {content}
                  </button>
                ) : (
                  <span className="flex items-center gap-2 px-2 py-1 text-sm">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  /** Развёрнутая карточка назначения для списка «См. больше». */
  function programCard(assignment: ProgramAssignmentResponse) {
    return (
      <div key={assignment.id} className="rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpenProgram(assignment)}
            className="font-semibold text-ink hover:underline"
          >
            {assignment.programName}
          </button>
          <p className="text-xs text-ink/50">назначена {dayMonthTime.format(new Date(assignment.assignedAt))}</p>
        </div>
        <div className="mt-1">{programBody(assignment)}</div>
      </div>
    );
  }

  function column({
    title,
    total,
    emptyLabel,
    rows,
    moreLabel,
    showMore,
    onMore,
  }: {
    title: string;
    total: number;
    emptyLabel: string;
    rows: ReactNode;
    moreLabel: string;
    showMore: boolean;
    onMore: () => void;
  }) {
    return (
      <div className="min-w-0">
        <h3 className="font-bold text-ink">{title}</h3>
        {total === 0 ? (
          <p className="mt-3 text-sm text-ink/60">{emptyLabel}</p>
        ) : (
          <div className="mt-3 space-y-1">{rows}</div>
        )}
        {showMore && (
          <button
            type="button"
            onClick={onMore}
            className="mt-3 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
          >
            {moreLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-bold text-ink">История</h2>
      <p className="mt-1 text-sm text-ink/60">Ближайшие планы клиента и всё, что было за последние три месяца.</p>

      {error && <p className="mt-3 text-sm text-coral">{error}</p>}
      {loading && <p className="mt-4 text-sm text-ink/50">Загрузка...</p>}

      {!loading && (
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0 space-y-6">
            {column({
              title: "Запланированные",
              total: upcomingWorkouts.length,
              emptyLabel: "Ничего не запланировано.",
              rows: upcomingWorkouts.slice(0, WORKOUT_PREVIEW_ROWS).map((sw) => workoutRow(sw, false)),
              moreLabel: "См. больше",
              showMore: upcomingWorkouts.length > MORE_FROM,
              onMore: () => setMoreOpen("upcoming"),
            })}
            {column({
              title: "Прошедшие",
              total: pastWorkouts.length,
              emptyLabel: "За три месяца тренировок не было.",
              rows: pastWorkouts.slice(0, WORKOUT_PREVIEW_ROWS).map((sw) => workoutRow(sw, false)),
              moreLabel: "См. больше",
              showMore: pastWorkouts.length > MORE_FROM,
              onMore: () => setMoreOpen("past"),
            })}
          </div>
          {column({
            title: "Комплексы",
            total: visibleAssignments.length,
            emptyLabel: "За три месяца комплексов не назначали.",
            rows: visibleAssignments
              .slice(0, PREVIEW_ROWS)
              .map((assignment, i) => programRow(assignment, i >= MOBILE_PREVIEW_ROWS)),
            moreLabel: "См. больше",
            showMore: visibleAssignments.length > MORE_FROM,
            onMore: () => setMoreOpen("programs"),
          })}
        </div>
      )}

      {moreOpen && (
        <DetailModal
          title={
            moreOpen === "upcoming"
              ? "Запланированные тренировки"
              : moreOpen === "past"
                ? "Прошедшие тренировки"
                : "Комплексы"
          }
          subtitle={moreOpen === "upcoming" ? "Ближайшие сверху." : "За последние три месяца, свежие сверху."}
          onClose={() => setMoreOpen(null)}
        >
          {moreOpen === "upcoming"
            ? upcomingWorkouts.map((sw) => workoutRow(sw, true))
            : moreOpen === "past"
              ? pastWorkouts.map((sw) => workoutRow(sw, true))
              : visibleAssignments.map(programCard)}
        </DetailModal>
      )}

      {openProgram && (
        <DetailModal
          title={openProgram.programName}
          subtitle={`Назначена ${dayMonthTime.format(new Date(openProgram.assignedAt))}`}
          onClose={() => setOpenProgram(null)}
          layer="top"
        >
          {programBody(openProgram)}
        </DetailModal>
      )}

      {openWorkout && (
        <WorkoutViewModal
          workout={openWorkout}
          programName={assignmentFor(openWorkout)?.programName}
          onOpenProgram={() => {
            const program = assignmentFor(openWorkout);
            if (!program) return;
            // Переход вбок, а не вглубь: окно программы встаёт на место окна тренировки.
            setOpenProgram(program);
            setOpenWorkout(null);
          }}
          onEdit={
            onEditWorkout &&
            (() => {
              onEditWorkout(openWorkout.id);
              // Уводим оба окна истории: правка открывается поверх календаря.
              setOpenWorkout(null);
              setMoreOpen(null);
            })
          }
          onClose={() => setOpenWorkout(null)}
        />
      )}
    </div>
  );
}
