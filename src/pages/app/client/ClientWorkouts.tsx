import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientWorkoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { ClientWorkoutCardResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { DetailModal } from "../../../components/DetailModal";
import { useModal } from "../../../hooks/useModal";
import { fromISODate } from "../trainer/calendarDates";
import { STATE_CHIP, STATE_LABEL } from "./workoutAccess";

const dayMonthWeekday = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "short" });

/** Открытая тренировка живёт на своей странице — туда и уходим из списка. */
function workoutPath(id: number): string {
  return `/dashboard/workouts/${id}`;
}

/**
 * Чип «Продолжить». Выглядит как чипы состояний рядом, но по нему нажимают — отсюда
 * заливка, шрифт крупнее и жирнее и высокая зона нажатия на телефоне.
 */
const ACTION_CHIP =
  "whitespace-nowrap rounded-full border border-solid border-primary bg-primary " +
  "font-bold leading-none text-white transition hover:brightness-110";

/**
 * Колонка, в которой стоят чипы и кнопки: всё внутри центрируется, поэтому центры стоят
 * на одной вертикали независимо от длины подписи. Ширина — по самым длинным элементам
 * списка, «Продолжить» (107px) и «Открыть» (101px), с небольшим запасом на случай, если
 * шрифт где-то ляжет чуть шире. Остальное уходит названию.
 */
const CHIP_COLUMN = "w-[112px] justify-center sm:w-[184px]";

/** Сколько строк видно в группе до «См. больше». */
const PREVIEW_ROWS = 3;
/** Высота раскрытого списка — чтобы окно не прыгало от числа тренировок. */
const LIST_VIEWPORT_HEIGHT = "24rem";

/**
 * Список тренировок клиента. Тренировка открывается один раз в свой день и живёт три часа,
 * поэтому в списке лежат только карточки: содержимое приходит с сервера на отдельной
 * странице тренировки, куда список и уводит.
 */
export function ClientWorkouts({
  cards,
  loading,
  loadError,
  reload,
}: {
  cards: ClientWorkoutCardResponse[];
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
}) {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState<ClientWorkoutCardResponse | null>(null);
  const [opening, setOpening] = useState(false);
  const [weight, setWeight] = useState("");

  const [moreOpen, setMoreOpen] = useState<"upcoming" | "past" | null>(null);

  useModal(confirming ? () => setConfirming(null) : null);

  // Ближайшее закрытие среди открытых тренировок.
  const nextExpiry = useMemo(() => {
    const times = cards
      .filter((c) => c.state === "OPEN" && c.expiresAt)
      .map((c) => new Date(c.expiresAt as string).getTime());
    return times.length > 0 ? Math.min(...times) : null;
  }, [cards]);

  // Когда окно доступа закрывается, список сам идёт к серверу: карточка должна перестать
  // быть открытой без участия клиента. Часы устройства только назначают момент проверки —
  // что с тренировкой на самом деле, решает ответ сервера.
  useEffect(() => {
    if (nextExpiry == null) return;
    const timer = window.setTimeout(() => void reload(), Math.max(0, nextExpiry - Date.now()) + 1000);
    return () => window.clearTimeout(timer);
  }, [nextExpiry, reload]);

  const grouped = useMemo(() => {
    const upcoming = cards.filter((c) => c.state === "AVAILABLE" || c.state === "OPEN" || c.state === "LOCKED");
    const past = [...cards.filter((c) => c.state === "CLOSED" || c.state === "MISSED")].reverse();
    return { upcoming, past };
  }, [cards]);

  /**
   * Открываем тренировку и уходим на её страницу. Список обновляем до перехода:
   * вернувшись назад, клиент должен увидеть «Продолжить», а не прежнее «Открыть».
   */
  async function confirmOpen() {
    if (!confirming || !weightValue) return;
    const card = confirming;
    setOpening(true);
    setError(null);
    try {
      await clientWorkoutApi.open(card.id, weightValue);
      setConfirming(null);
      setWeight("");
      await reload();
      navigate(workoutPath(card.id));
    } catch (e) {
      setError(apiErrorMessage(e, "Не удалось открыть тренировку"));
      setConfirming(null);
      await reload();
    } finally {
      setOpening(false);
    }
  }

  function card(item: ClientWorkoutCardResponse) {
    return (
      // Чип статуса вынесен из строки с датой: так он прижат к правому краю
      // карточки и стоит по центру её высоты — на узком экране это заметно, а на
      // широком строка выглядит как раньше (чип и так был крайним справа).
      <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-offwhite px-4 py-3">
        <div className="min-w-0 flex-1">
          {/* Узкий экран: название занимает свою строку целиком. В один ряд с датой
              и кнопкой оно не помещалось и обрезалось до пары букв. */}
          <p className="text-sm font-semibold text-ink sm:hidden">{item.name}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-sm:mt-1.5">
            <span className="w-28 shrink-0 text-xs font-semibold text-ink/50">
              {dayMonthWeekday.format(fromISODate(item.scheduledDate))}
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-ink sm:block">
              {item.name}
            </span>

            {/* Кнопка стоит в колонке той же ширины, что и чипы статуса, — тогда на
                широком экране всё правое поле списка выстроено по одной вертикали.
                Ширина колонки взята по самому длинному элементу, чипу с отсчётом.
                На узком экране кнопка по-прежнему занимает строку целиком. */}
          </div>
        </div>

        <span className={`flex shrink-0 ${CHIP_COLUMN}`}>
          {item.state === "AVAILABLE" && (
            <Button type="button" onClick={() => setConfirming(item)} className="!px-4 !py-2 !text-xs">
              Открыть
            </Button>
          )}
          {item.state === "OPEN" && (
            <button
              type="button"
              onClick={() => navigate(workoutPath(item.id))}
              className={`${ACTION_CHIP} px-2 py-[10px] text-xs sm:px-2 sm:py-[5px]`}
            >
              Продолжить
            </button>
          )}
          {item.state !== "AVAILABLE" && item.state !== "OPEN" && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATE_CHIP[item.state]}`}
            >
              {STATE_LABEL[item.state]}
            </span>
          )}
        </span>
      </div>
    );
  }

  function group(
    title: string,
    items: ClientWorkoutCardResponse[],
    emptyLabel: string,
    key: "upcoming" | "past",
  ) {
    return (
      <div>
        <h3 className="font-bold text-ink">{title}</h3>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">{emptyLabel}</p>
        ) : (
          <div className="mt-3 space-y-1">
            {items.slice(0, PREVIEW_ROWS).map(card)}
          </div>
        )}
        {items.length > PREVIEW_ROWS && (
          <button
            type="button"
            onClick={() => setMoreOpen(key)}
            className="mt-3 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
          >
            См. больше
          </button>
        )}
      </div>
    );
  }

  // Вес обязателен, и он должен быть числом в разумных пределах — те же границы, что на сервере.
  const parsedWeight = Number(weight.trim());
  const weightValue =
    weight.trim() && Number.isFinite(parsedWeight) && parsedWeight >= 20 && parsedWeight <= 400
      ? parsedWeight
      : null;

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink">Мои тренировки</h2>
      <p className="mt-1 text-sm text-ink/60">
        Тренировку можно открыть только в её день. После открытия она доступна три часа.
      </p>

      {(error ?? loadError) && <p className="mt-3 text-sm text-coral">{error ?? loadError}</p>}
      {loading && <p className="mt-4 text-sm text-ink/50">Загрузка...</p>}

      {!loading && (
        <div className="mt-5 space-y-8">
          {group("Ближайшие", grouped.upcoming, "Тренировок пока не назначено.", "upcoming")}
          {group("Прошедшие", grouped.past, "Здесь появятся тренировки, которые уже прошли.", "past")}
        </div>
      )}

      {moreOpen && (
        <DetailModal
          title={moreOpen === "upcoming" ? "Ближайшие тренировки" : "Прошедшие тренировки"}
          subtitle={moreOpen === "upcoming" ? "Ближайшие сверху." : "Свежие сверху."}
          bodyHeight={LIST_VIEWPORT_HEIGHT}
          onClose={() => setMoreOpen(null)}
        >
          <div className="space-y-1">
            {(moreOpen === "upcoming" ? grouped.upcoming : grouped.past).map(card)}
          </div>
        </DetailModal>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4"
          onClick={() => setConfirming(null)}
        >
          <div
            className="relative w-full max-w-md rounded-card bg-white p-5 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-ink">{confirming.name}</h2>
            <p className="mt-2 text-sm text-ink/70">
              Тренировка будет доступна три часа с этой минуты. Открыть её можно один раз — если
              три часа выйдут, попросите тренера открыть заново.
            </p>

            {/* Вес спрашиваем здесь, а не в профиле: так он привязан к конкретной тренировке
                и из этих точек собирается график в статистике. */}
            <label className="mt-6 block text-sm font-semibold text-ink">
              Ваш вес сегодня
              <div className="mt-2 flex items-center gap-2 rounded-full border border-line bg-offwhite px-4 py-2.5">
                <input
                  autoFocus
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(",", "."))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && weightValue) void confirmOpen();
                  }}
                  placeholder="например, 78.5"
                  className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
                />
                <span className="shrink-0 text-sm text-ink/40">кг</span>
              </div>
            </label>

            {/* На телефоне кнопки в столбик: рядом они ужимаются до нечитаемых. */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={confirmOpen} disabled={opening || !weightValue} className="flex-1">
                {opening ? "Открываем..." : "Открыть на 3 часа"}
              </Button>
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  setConfirming(null);
                  setWeight("");
                }}
                className="flex-1 !border !border-line"
              >
                Не сейчас
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
