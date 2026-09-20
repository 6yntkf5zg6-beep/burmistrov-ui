import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { scheduledWorkoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { ScheduledWorkoutResponse, TrainerClientResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { CommentBadge } from "../../../components/CommentBadge";
import { useModal } from "../../../hooks/useModal";
import {
  DAYS,
  EXTENDED_CALENDAR_MONTHS,
  EXTENDED_CALENDAR_MONTHS_BACK,
  MONTHS,
  MONTH_TITLES,
  addDays,
  fromISODate,
  isSameDate,
  monthCells,
  startOfWeekMonday,
  toISODate,
} from "./calendarDates";
import { CalendarDayDots, MAX_DOTS } from "./CalendarDayDots";
import { WorkoutViewModal } from "./WorkoutViewModal";
import { WORKOUT_STATE_TITLE, workoutDot, workoutPill, workoutState } from "./workoutStatus";

/**
 * Общий календарь тренера: все назначенные дни по всем клиентам сразу.
 *
 * Читать, а не править: расписание конкретного человека живёт на его странице, здесь только
 * обзор — кто и когда занимается, что уже пройдено и где клиент оставил комментарий.
 */
export function TrainerScheduleCalendar({ clients }: { clients: TrainerClientResponse[] }) {
  const navigate = useNavigate();

  const [scheduled, setScheduled] = useState<ScheduledWorkoutResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [viewWorkout, setViewWorkout] = useState<ScheduledWorkoutResponse | null>(null);
  // На узком экране показываем один выбранный день: имена в клетку 46px не помещаются.
  const [pickedISO, setPickedISO] = useState<string | null>(null);
  // В окне «См. больше» свой выбранный день: он может быть в другом месяце, и лента
  // на самой странице от него меняться не должна.
  const [morePickedISO, setMorePickedISO] = useState<string | null>(null);

  const monthsScrollRef = useRef<HTMLDivElement | null>(null);
  const currentMonthRef = useRef<HTMLElement | null>(null);

  useModal(moreOpen ? () => setMoreOpen(false) : null);

  useEffect(() => {
    scheduledWorkoutApi
      .listForTrainer()
      .then(setScheduled)
      .catch((e) => setError(apiErrorMessage(e, "Не удалось загрузить календарь")))
      .finally(() => setLoading(false));
  }, []);

  // Список начинается с двух прошедших месяцев — открываем окно на текущем.
  useEffect(() => {
    if (!moreOpen) return;
    setMorePickedISO(null);
    const container = monthsScrollRef.current;
    const current = currentMonthRef.current;
    if (!container || !current) return;
    container.scrollTop = current.offsetTop - container.offsetTop;
  }, [moreOpen]);

  const today = new Date();
  const weekStart = startOfWeekMonday(today);
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.clientId, client.clientName])),
    [clients],
  );

  const selectedISO = pickedISO ?? toISODate(today);
  const moreSelectedISO = morePickedISO ?? toISODate(today);

  const byDate = useMemo(() => {
    const map: Record<string, ScheduledWorkoutResponse[]> = {};
    for (const sw of scheduled) {
      (map[sw.scheduledDate] ??= []).push(sw);
    }
    return map;
  }, [scheduled]);

  /** @param roomy в клетке сетки места мало, в списке под сеткой по плашке нужно попадать пальцем. */
  function renderWorkoutPill(sw: ScheduledWorkoutResponse, roomy = false) {
    const pill = workoutPill(sw);
    const name = clientNames.get(sw.clientId);
    return (
      <button
        key={sw.id}
        type="button"
        onClick={() => setViewWorkout(sw)}
        title={`${name ?? "Клиент"} · ${sw.name} — ${WORKOUT_STATE_TITLE[workoutState(sw)]}`}
        className={`flex w-full items-center gap-1 rounded-full border px-2 text-left text-xs ${
          roomy ? "py-2.5" : "py-1"
        } ${pill.className}`}
      >
        {/* В общем календаре важно, кто занимается; что именно — видно в подсказке
            и в окне тренировки. */}
        <span className="min-w-0 flex-1 truncate font-semibold">{name ?? "Клиент"}</span>
        <CommentBadge count={sw.comments.length} />
      </button>
    );
  }

  /** Компактная клетка для узкого экрана: число и точки по числу тренировок. */
  function renderCompactCell(day: Date, pickedDayISO: string, onPick: (iso: string) => void) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < toISODate(today);
    const dayWorkouts = byDate[iso] ?? [];
    const picked = iso === pickedDayISO;

    const dots = dayWorkouts.slice(0, MAX_DOTS).map(workoutDot);
    if (dayWorkouts.some((sw) => sw.comments.length > 0) && dots.length < MAX_DOTS) {
      dots.push("bg-amber");
    }

    return (
      <button
        key={iso}
        type="button"
        onClick={() => onPick(iso)}
        className={`flex aspect-square flex-col items-center justify-center rounded-xl border transition ${
          picked ? "border-2 border-primary bg-mint/30" : isToday ? "border-primary" : "border-line"
        }`}
      >
        <span
          className={`text-[15px] font-bold leading-none ${
            picked ? "text-primary" : isToday ? "text-primary" : isPast ? "text-ink/35" : "text-ink"
          }`}
        >
          {day.getDate()}
        </span>
        <CalendarDayDots dots={dots} more={Math.max(0, dayWorkouts.length - MAX_DOTS)} />
      </button>
    );
  }

  /** Состав выбранного дня под компактной сеткой: плашки крупнее, с именами клиентов. */
  function renderDayPanel(iso: string) {
    const day = fromISODate(iso);
    const dayWorkouts = byDate[iso] ?? [];
    return (
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
          {day.getDate()} {MONTHS[day.getMonth()]}
          {isSameDate(day, today) ? " · сегодня" : ""}
        </p>
        <div className="mt-2 space-y-1.5">
          {dayWorkouts.length === 0 ? (
            <p className="text-xs text-ink/45">В этот день тренировок нет.</p>
          ) : (
            dayWorkouts.map((sw) => renderWorkoutPill(sw, true))
          )}
        </div>
      </div>
    );
  }

  function renderDayCell(day: Date) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < toISODate(today);
    const dayWorkouts = byDate[iso] ?? [];

    return (
      <div
        key={iso}
        className={`min-h-[92px] rounded-2xl border p-2 ${isToday ? "border-primary bg-mint/20" : "border-line"}`}
      >
        <span
          className={`text-xs font-semibold ${isToday ? "text-primary" : isPast ? "text-ink/30" : "text-ink/60"}`}
        >
          {day.getDate()} {MONTHS[day.getMonth()]}
        </span>

        <div className="mt-1.5 space-y-1">{dayWorkouts.map((sw) => renderWorkoutPill(sw))}</div>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-bold text-ink">Календарь</h2>
      <p className="mt-1 text-sm text-ink/60">
        Все тренировки по всем клиентам на текущую и следующую неделю.
      </p>

      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      {loading && <p className="mt-4 text-sm text-ink/50">Загрузка...</p>}

      {!loading && (
        <>
          {/* Узкий экран: клетка всего 46px — имена в неё не влезают, поэтому
              в сетке только числа и точки, а имена показываем под ней за выбранный день. */}
          <div className="lg:hidden">
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-ink/40">
              {DAYS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            <div className="mt-1.5 grid grid-cols-7 gap-1">
              {days.map((day) => renderCompactCell(day, selectedISO, setPickedISO))}
            </div>

            {renderDayPanel(selectedISO)}
          </div>

          <div className="hidden lg:block">
            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-ink/40">
              {DAYS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            {[0, 1].map((week) => (
              <div key={week} className="mt-2 grid grid-cols-7 gap-2">
                {days.slice(week * 7, week * 7 + 7).map(renderDayCell)}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="mt-3 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
          >
            См. больше
          </button>
        </>
      )}

      {moreOpen && (
        <div
          // На телефоне окно занимает половину экрана — прижатое к верху, оно висело бы
          // в пустоте. На широком экране оно и так почти во весь экран, там верх привычнее.
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-8 lg:items-start"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-4xl flex-col rounded-card bg-white p-5 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Закрыть"
              className="absolute right-2 top-2 px-3 py-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-ink sm:text-xl">Календарь</h2>
            <p className="mt-1 pr-8 text-xs text-ink/60 sm:pr-0 sm:text-sm">
              Текущий месяц, два предыдущих и два следующих — прокрутите, чтобы увидеть остальные.
            </p>

            {/* На телефоне высота подобрана так, чтобы в окно попадал ровно один месяц,
                даже самый длинный, шестинедельный. На широком экране список занимает всё,
                что осталось от окна. */}
            <div
              ref={monthsScrollRef}
              className="mt-4 h-[300px] overflow-y-auto overscroll-contain sm:pr-2 lg:h-auto lg:min-h-0 lg:flex-1"
            >
              {Array.from({ length: EXTENDED_CALENDAR_MONTHS }, (_, offset) => {
                const monthStart = new Date(
                  today.getFullYear(),
                  today.getMonth() + offset - EXTENDED_CALENDAR_MONTHS_BACK,
                  1,
                );
                const year = monthStart.getFullYear();
                const month = monthStart.getMonth();
                const isCurrentMonth = offset === EXTENDED_CALENDAR_MONTHS_BACK;
                return (
                  <section
                    key={`${year}-${month}`}
                    ref={isCurrentMonth ? currentMonthRef : undefined}
                    className={offset === 0 ? "" : "mt-8"}
                  >
                    <h3 className="text-sm font-bold text-ink">
                      {MONTH_TITLES[month]} {year}
                    </h3>
                    {/* Узкий экран: клетка — число и точки, состав дня в панели снизу. */}
                    <div className="lg:hidden">
                      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-ink/40">
                        {DAYS.map((label) => (
                          <div key={label}>{label}</div>
                        ))}
                      </div>
                      <div className="mt-1.5 grid grid-cols-7 gap-1">
                        {monthCells(year, month).map((day, index) =>
                          day ? (
                            renderCompactCell(day, moreSelectedISO, setMorePickedISO)
                          ) : (
                            <div key={`pad-${index}`} />
                          ),
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-ink/40">
                        {DAYS.map((label) => (
                          <div key={label}>{label}</div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-2">
                        {monthCells(year, month).map((day, index) =>
                          day ? renderDayCell(day) : <div key={`pad-${index}`} />,
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Состав выбранного дня: на узком экране он не помещается в клетку. */}
            <div className="shrink-0 lg:hidden">{renderDayPanel(moreSelectedISO)}</div>
          </div>
        </div>
      )}

      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          action={
            <Button
              type="button"
              variant="neutral"
              onClick={() => navigate(`/dashboard/trainer/clients/${viewWorkout.clientId}`)}
              className="!border !border-line !px-4 !py-2 !text-xs"
            >
              Открыть клиента
            </Button>
          }
          onClose={() => setViewWorkout(null)}
        />
      )}
    </div>
  );
}
