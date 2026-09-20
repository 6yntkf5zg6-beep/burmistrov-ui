import type { ReactNode } from "react";
import type { ScheduledWorkoutResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { CommentBadge } from "../../../components/CommentBadge";
import { DetailModal } from "../../../components/DetailModal";
import { ExerciseMedia } from "../../../components/ExerciseMedia";
import { WORKOUT_STATE_LABEL, WORKOUT_STATE_TITLE, workoutState } from "./workoutStatus";

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const timeOnly = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Ручная отметка тренера — это не открытие: клиент был в зале, но тренировку не открывал.
 * Писать про неё «была открыта» было бы неправдой.
 */
function attendanceLine(sw: ScheduledWorkoutResponse): string {
  const attendedAt = sw.attendance?.attendedAt;
  if (!attendedAt) return "не открывал";
  return sw.attendance?.attendanceSource === "TRAINER"
    ? `посещение отметил тренер в ${timeOnly.format(new Date(attendedAt))}`
    : `была открыта в ${timeOnly.format(new Date(attendedAt))}`;
}

/** Состав тренировки: упражнения, проставленные подходы и комментарии клиента. */
export function WorkoutBody({ workout }: { workout: ScheduledWorkoutResponse }) {
  const exercises = workout.workout.exercises;

  return (
    <div className="space-y-2">
      {workout.workout.description && <p className="text-sm text-ink/60">{workout.workout.description}</p>}

      {exercises.length === 0 ? (
        <p className="text-sm text-ink/60">В тренировке нет упражнений.</p>
      ) : (
        exercises.map((exercise, index) => (
          <div
            key={`${exercise.exerciseId ?? exercise.name}-${index}`}
            className="rounded-2xl border border-line px-3 py-3 sm:px-4"
          >
            {/*
              На широком экране подходы стоят в одну строку с названием — там на всё хватает
              места. На телефоне они уходят под название: в общей строке им доставалась треть
              ширины, они ломались на два ряда, а названию оставалось «Тяга штанги в нак…».
            */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 font-semibold text-ink sm:truncate">{exercise.name}</p>
                <ExerciseMedia imageUrl={exercise.imageUrl} videoUrl={exercise.videoUrl} />
              </span>

              {exercise.sets.length === 0 ? (
                <span className="shrink-0 text-xs text-ink/40">без подходов</span>
              ) : (
                // Подходы держатся одной строкой: при десятке подходов она прокручивается
                // вбок, а не разрастается в сетку, по которой трудно читать прогрессию весов.
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:justify-end sm:overflow-x-visible">
                  {exercise.sets.map((set, setIndex) => (
                    <span
                      key={setIndex}
                      className="shrink-0 whitespace-nowrap rounded-full bg-offwhite px-2.5 py-1 text-xs text-ink/70"
                      title={`Подход ${setIndex + 1}: вес × повторения`}
                    >
                      {set.weightKg != null ? `${set.weightKg}кг` : "—"} × {set.reps ?? "—"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {exercise.notes && <p className="mt-1 text-xs text-ink/50">{exercise.notes}</p>}

            {workout.comments
              .filter((comment) => comment.exerciseUid === exercise.uid)
              .map((comment) => (
                <div
                  key={comment.id}
                  className="mt-2 flex items-start gap-2 rounded-xl border border-amber/60 bg-amber/10 px-3 py-2"
                >
                  <CommentBadge count={1} className="mt-0.5" />
                  <p className="min-w-0 text-xs text-ink/80">{comment.text}</p>
                </div>
              ))}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Просмотр одного дня без правки — одинаковый в календаре и в истории.
 *
 * @param programName программа, из которой день попал в календарь. Строка появляется, только
 *        если вызывающий знает про программы: календарь их не загружает.
 */
export function WorkoutViewModal({
  workout,
  programName,
  onOpenProgram,
  onEdit,
  action,
  onClose,
  layer = "top",
}: {
  workout: ScheduledWorkoutResponse;
  programName?: string;
  onOpenProgram?: () => void;
  onEdit?: () => void;
  /** Своя кнопка в шапке вместо «Редактировать» — например, переход к клиенту. */
  action?: ReactNode;
  onClose: () => void;
  layer?: "base" | "top";
}) {
  const state = workoutState(workout);

  return (
    <DetailModal
      title={workout.name}
      subtitle={
        <>
          <CommentBadge count={workout.comments.length} className="mr-1 inline-grid align-[-2px]" />
          {dayMonth.format(fromISODate(workout.scheduledDate))} ·{" "}
          <span title={WORKOUT_STATE_TITLE[state]}>{WORKOUT_STATE_LABEL[state]}</span>
          {" · "}
          {attendanceLine(workout)}
        </>
      }
      action={
        action ??
        (onEdit && (
          <Button
            type="button"
            variant="neutral"
            onClick={onEdit}
            className="!border !border-line !px-4 !py-2 !text-xs"
          >
            Редактировать
          </Button>
        ))
      }
      onClose={onClose}
      layer={layer}
    >
      {programName && (
        <button
          type="button"
          onClick={onOpenProgram}
          disabled={!onOpenProgram}
          className="flex w-full items-center gap-3 rounded-2xl bg-offwhite px-4 py-2 text-left transition enabled:hover:bg-line/60 disabled:cursor-default"
        >
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Комплекс</span>
          <span
            className={`min-w-0 flex-1 truncate text-sm font-semibold ${
              onOpenProgram ? "text-primary" : "text-ink"
            }`}
          >
            {programName}
          </span>
          {onOpenProgram && (
            <span aria-hidden className="shrink-0 text-ink/30">
              ›
            </span>
          )}
        </button>
      )}

      <WorkoutBody workout={workout} />
    </DetailModal>
  );
}
