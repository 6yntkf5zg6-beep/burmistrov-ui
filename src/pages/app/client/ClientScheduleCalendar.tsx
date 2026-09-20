import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientWorkoutCardResponse } from "../../../api/types";
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
} from "../trainer/calendarDates";
import { CalendarDayDots, MAX_DOTS } from "../trainer/CalendarDayDots";
import { STATE_DOT, STATE_PILL, STATE_TITLE } from "./workoutAccess";

/**
 * Расписание клиента в виде календаря. Только смотреть: тренировка открывается из списка
 * ниже, где рядом написано, что открыть её можно один раз и на три часа.
 */
export function ClientScheduleCalendar({
  cards,
  loading,
}: {
  cards: ClientWorkoutCardResponse[];
  loading: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  // На узком экране вместо сетки — лента дней; показываем один выбранный день.
  const [pickedISO, setPickedISO] = useState<string | null>(null);
  // В окне «См. больше» свой выбранный день: он может быть в другом месяце,
  // и лента на самой странице от него меняться не должна.
  const [morePickedISO, setMorePickedISO] = useState<string | null>(null);
  const monthsScrollRef = useRef<HTMLDivElement | null>(null);
  const currentMonthRef = useRef<HTMLElement | null>(null);

  useModal(moreOpen ? () => setMoreOpen(false) : null);

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
  const todayISO = toISODate(today);
  const weekStart = startOfWeekMonday(today);
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

  const selectedISO = pickedISO ?? todayISO;
  const selectedDay = days.find((day) => toISODate(day) === selectedISO) ?? today;

  const moreSelectedISO = morePickedISO ?? todayISO;
  const moreSelectedDay = fromISODate(moreSelectedISO);

  const byDate = useMemo(() => {
    const map: Record<string, ClientWorkoutCardResponse[]> = {};
    for (const card of cards) {
      (map[card.scheduledDate] ??= []).push(card);
    }
    return map;
  }, [cards]);

  function renderWorkoutPill(card: ClientWorkoutCardResponse, roomy = false) {
    // В клетке сетки места мало, в списке под лентой плашка крупнее.
    const className = `flex w-full items-center gap-2 rounded-full border px-2 text-left text-xs ${
      roomy ? "py-2.5" : "py-1"
    } ${STATE_PILL[card.state]}`;

    // Открытая тренировка помечается словом, а не заливкой. В тесной клетке сетки
    // пометка не влезает — там состояние по-прежнему видно только по цвету плашки.
    const body = (
      <>
        <span className="min-w-0 flex-1 truncate">{card.name}</span>
        {roomy && card.state === "OPEN" && (
          <span className="shrink-0 font-semibold text-primary">В процессе</span>
        )}
      </>
    );

    return (
      <div key={card.id} title={`${card.name} — ${STATE_TITLE[card.state]}`} className={className}>
        {body}
      </div>
    );
  }

  /** Клетка ленты дней: день недели, число и точки по числу тренировок. */
  function renderStripDay(day: Date) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < todayISO;
    const dayCards = byDate[iso] ?? [];
    const picked = iso === selectedISO;

    return (
      <button
        key={iso}
        type="button"
        onClick={() => setPickedISO(iso)}
        className={`w-[52px] shrink-0 rounded-2xl border py-2 text-center transition ${
          picked ? "border-2 border-primary bg-mint/30 py-[7px]" : "border-line"
        }`}
      >
        <span
          className={`block text-[10px] font-bold uppercase ${picked || isToday ? "text-primary" : "text-ink/40"}`}
        >
          {DAYS[(day.getDay() + 6) % 7]}
        </span>
        <span
          className={`mt-0.5 block text-[19px] font-bold leading-none ${
            picked || isToday ? "text-primary" : isPast ? "text-ink/35" : "text-ink"
          }`}
        >
          {day.getDate()}
        </span>
        <CalendarDayDots
          dots={dayCards.slice(0, MAX_DOTS).map((card) => STATE_DOT[card.state])}
          more={Math.max(0, dayCards.length - MAX_DOTS)}
        />
      </button>
    );
  }

  /**
   * Клетка месяца на узком экране. Плашки с названиями в 40 пикселей ширины
   * не помещаются, поэтому в клетке только число и точки, а состав дня
   * показывается ниже — в панели под списком месяцев.
   */
  function renderCompactCell(day: Date) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < todayISO;
    const dayCards = byDate[iso] ?? [];
    const picked = iso === moreSelectedISO;

    return (
      <button
        key={iso}
        type="button"
        onClick={() => setMorePickedISO(iso)}
        className={`flex aspect-square flex-col items-center justify-center rounded-xl border transition ${
          picked ? "border-2 border-primary bg-mint/30" : isToday ? "border-primary" : "border-line"
        }`}
      >
        <span
          className={`text-[15px] font-bold leading-none ${
            picked || isToday ? "text-primary" : isPast ? "text-ink/35" : "text-ink"
          }`}
        >
          {day.getDate()}
        </span>
        <CalendarDayDots
          dots={dayCards.slice(0, MAX_DOTS).map((card) => STATE_DOT[card.state])}
          more={Math.max(0, dayCards.length - MAX_DOTS)}
        />
      </button>
    );
  }

  function renderDayCell(day: Date) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < todayISO;

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

        <div className="mt-1.5 space-y-1">
          {(byDate[iso] ?? []).map((card) => renderWorkoutPill(card))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink">Календарь</h2>
      <p className="mt-1 text-sm text-ink/60">Ваши тренировки на текущую и следующую неделю.</p>

      {loading && <p className="mt-4 text-sm text-ink/50">Загрузка...</p>}

      {!loading && (
        <>
          {/* Узкий экран: сетка 7×2 не читается, дни идут лентой с прокруткой вбок. */}
          <div className="lg:hidden">
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {days.map(renderStripDay)}
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                {selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]}
                {isSameDate(selectedDay, today) ? " · сегодня" : ""}
              </p>
              <div className="mt-2 space-y-1.5">
                {(byDate[selectedISO] ?? []).length === 0 ? (
                  <p className="text-xs text-ink/45">В этот день тренировок нет.</p>
                ) : (
                  (byDate[selectedISO] ?? []).map((card) => renderWorkoutPill(card, true))
                )}
              </div>
            </div>
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

            {/* На телефоне окно во весь экран показывало полтора месяца — высота подобрана
                так, чтобы в него попадал ровно один, даже самый длинный, шестинедельный.
                На широком экране список по-прежнему занимает всё, что осталось от окна. */}
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
                          day ? renderCompactCell(day) : <div key={`pad-${index}`} />,
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
            <div className="mt-3 shrink-0 border-t border-line pt-3 lg:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                {moreSelectedDay.getDate()} {MONTHS[moreSelectedDay.getMonth()]}
                {isSameDate(moreSelectedDay, today) ? " · сегодня" : ""}
              </p>
              <div className="mt-2 max-h-[30vh] space-y-1.5 overflow-y-auto overscroll-contain">
                {(byDate[moreSelectedISO] ?? []).length === 0 ? (
                  <p className="text-xs text-ink/45">В этот день тренировок нет.</p>
                ) : (
                  (byDate[moreSelectedISO] ?? []).map((card) => renderWorkoutPill(card, true))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
