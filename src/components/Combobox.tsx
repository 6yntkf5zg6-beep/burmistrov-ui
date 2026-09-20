import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { isWideScreen } from "../hooks/screen";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface Props {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Уменьшенный вариант — для списков внутри таблиц и плотных панелей. */
  compact?: boolean;
  className?: string;
  emptyLabel?: string;
}

/** Сколько вариантов видно без прокрутки. */
const VISIBLE_OPTIONS = 5;
const OPTION_HEIGHT = 36;
const OPTION_HEIGHT_COMPACT = 28;
/** Вертикальные отступы самого списка (py-1). */
const LIST_PADDING = 8;
const GAP = 4;
/** Меньше двух строк список показывать бессмысленно — лучше пусть немного вылезет. */
const MIN_VISIBLE_OPTIONS = 2;
/** Насколько палец может съехать, чтобы касание ещё считалось выбором, а не прокруткой. */
const TAP_SLOP = 8;

interface Anchor {
  left: number;
  width: number;
  bottom: number;
  maxHeight: number;
}

/**
 * Нижняя граница видимой части экрана в координатах вёрстки.
 *
 * На телефоне при поднятой клавиатуре {@code window.innerHeight} остаётся прежним — окно
 * не уменьшилось, его просто наполовину закрыли. Настоящий видимый край знает только
 * visualViewport; без него список уезжал бы под клавиатуру.
 */
function visibleBottom(): number {
  const vv = window.visualViewport;
  return vv ? vv.offsetTop + vv.height : window.innerHeight;
}

/**
 * Выпадающий список с фильтром: в поле можно печатать, и остаются подходящие варианты.
 *
 * Ввод и выбор живут в одном поле: пока список закрыт, в нём написано выбранное значение,
 * при открытии оно уходит в подсказку и поле становится строкой поиска. Благодаря этому
 * `required` остаётся нативным — браузер видит непустое поле ровно тогда, когда вариант выбран.
 *
 * Сам список рисуется порталом в body с position: fixed. Абсолютное позиционирование обрезалось
 * бы прокручиваемым контейнером модалки, а так список не зависит от overflow предков.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  compact = false,
  className = "",
  emptyLabel = "Ничего не найдено",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /**
   * Телефон: первое касание только раскрывает список, курсор в поле ставит второе.
   *
   * Клавиатура занимает половину экрана, а список чаще всего просматривают, а не ищут в
   * нём по буквам — незачем показывать её тем, кто просто хочет выбрать из пяти вариантов.
   * С настоящей клавиатурой отнимать нечего, там поле работает как раньше.
   */
  const [browseFirst] = useState(() => !isWideScreen());
  const [typing, setTyping] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Откуда начали жать по варианту: палец проехал — значит, листали, а не выбирали.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  // Был ли список открыт до этого касания. Снимаем на pointerdown: к моменту click
  // список уже открыт обработчиком focus, и первое касание не отличить от второго.
  const wasOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listId = useId();

  const optionHeight = compact ? OPTION_HEIGHT_COMPACT : OPTION_HEIGHT;
  const maxHeight = VISIBLE_OPTIONS * optionHeight + LIST_PADDING;

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setTyping(false);
  }

  /** Второе касание по полю: поднимаем клавиатуру. */
  function startTyping() {
    setTyping(true);
    const input = inputRef.current;
    if (!input) return;
    // Правим атрибут руками и переставляем фокус, не дожидаясь перерисовки: клавиатуру
    // телефон поднимает только внутри жеста, а смена inputmode на уже сфокусированном
    // поле сама по себе её не зовёт.
    input.inputMode = "text";
    input.blur();
    input.focus();
  }

  /**
   * Позиция списка снимается с поля каждый кадр, пока список открыт.
   *
   * Подписки на resize и scroll этого не заменяют: на iOS клавиатура двигает и окно, и само
   * модальное окно, не поднимая ни одного события, на которое можно подписаться. Список
   * оставался там, где поле было до появления клавиатуры, — и оказывался поверх него.
   * Опрос каждый кадр переживает любые такие сдвиги, а стоит он одного getBoundingClientRect
   * и сравнения строки: перерисовка случается, только когда позиция правда изменилась.
   */
  useLayoutEffect(() => {
    if (!open) return;

    let frame = 0;
    let previous = "";

    function measure() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      // Список всегда раскрывается вниз. Вверх он открывался, когда снизу оставалось мало
      // места, но на iOS «мало места» случалось и там, где его хватало, и список внезапно
      // накрывал поле. Вместо переворота просто ужимаем его до того, что видно снизу.
      const spaceBelow = visibleBottom() - rect.bottom - GAP * 2;
      const next: Anchor = {
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        bottom: Math.round(rect.bottom),
        maxHeight: Math.round(
          Math.max(MIN_VISIBLE_OPTIONS * optionHeight + LIST_PADDING, Math.min(maxHeight, spaceBelow)),
        ),
      };
      const key = `${next.left}|${next.width}|${next.bottom}|${next.maxHeight}`;
      if (key === previous) return;
      previous = key;
      setAnchor(next);
    }

    function tick() {
      measure();
      frame = requestAnimationFrame(tick);
    }

    measure();
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, maxHeight, optionHeight]);

  // Клик мимо — закрываем. Именно pointerdown, а не click: тогда к моменту нажатия на
  // «Сохранить» поле уже успевает вернуть выбранное значение, и валидация формы его видит.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || filtered.length === 0) return;
    (listRef.current?.children[highlight] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, filtered.length]);

  function pick(option: ComboboxOption) {
    onChange(option.value);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setHighlight((current) =>
        event.key === "ArrowDown"
          ? (current + 1) % filtered.length
          : (current - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Enter" && open) {
      const option = filtered[highlight];
      if (option) {
        event.preventDefault();
        pick(option);
      }
      return;
    }

    // Выбранное значение стирается целиком: удалять его по букве незачем — это не текст,
    // который правят, а один выбор. А вот набранный запрос правится посимвольно, как обычно.
    if ((event.key === "Backspace" || event.key === "Delete") && query === "" && value) {
      event.preventDefault();
      onChange("");
      setOpen(true);
      return;
    }

    if (event.key === "Escape" && open) {
      // Не даём событию дойти до окна: первый Esc закрывает список, второй — окно.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const fieldClass = compact
    ? "w-full rounded-full border border-line bg-offwhite py-1.5 pl-3 pr-8 text-xs outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
    : "w-full rounded-full border border-line bg-offwhite py-2.5 pl-4 pr-9 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50";

  const listStyle: CSSProperties | undefined = anchor
    ? {
        position: "fixed",
        left: anchor.left,
        width: anchor.width,
        top: anchor.bottom + GAP,
        maxHeight: anchor.maxHeight,
      }
    : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={open ? query : (selected?.label ?? "")}
        placeholder={selected && open ? selected.label : placeholder}
        // Пока список просто просматривают, клавиатура не нужна: inputmode="none" оставляет
        // поле обычным — с фокусом, курсором и проверкой required, — но не зовёт её.
        inputMode={browseFirst && !typing ? "none" : "text"}
        onFocus={() => setOpen(true)}
        onPointerDown={() => {
          wasOpenRef.current = open;
        }}
        onClick={() => {
          // Первое касание — только список. Заодно открывает его повторно после выбора,
          // когда поле уже в фокусе и события focus не будет.
          if (!wasOpenRef.current) {
            setOpen(true);
            return;
          }
          if (browseFirst && !typing) startTyping();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={fieldClass}
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink/40 transition-transform ${
          compact ? "right-3 h-3 w-3" : "right-3.5 h-3.5 w-3.5"
        } ${open ? "rotate-180" : ""}`}
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {open &&
        listStyle &&
        createPortal(
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            style={listStyle}
            className="z-[70] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white py-1 shadow-card"
          >
            {filtered.length === 0 ? (
              <li className={`px-4 text-ink/40 ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}>{emptyLabel}</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onPointerDown={(event) => {
                    // Мышью — не даём полю потерять фокус до того, как выбор применится.
                    // Пальцем так делать нельзя: preventDefault отменяет и прокрутку, из-за
                    // чего список нельзя было пролистать — он выбирал вариант на касании.
                    if (event.pointerType === "mouse") event.preventDefault();
                    pressRef.current = { x: event.clientX, y: event.clientY };
                  }}
                  onPointerUp={(event) => {
                    const start = pressRef.current;
                    pressRef.current = null;
                    if (!start) return;
                    // Палец проехал по списку — это была прокрутка, а не выбор.
                    const moved =
                      Math.abs(event.clientX - start.x) > TAP_SLOP ||
                      Math.abs(event.clientY - start.y) > TAP_SLOP;
                    if (!moved) pick(option);
                  }}
                  onPointerCancel={() => {
                    pressRef.current = null;
                  }}
                  onPointerEnter={() => setHighlight(index)}
                  className={`cursor-pointer truncate px-4 transition-colors ${
                    compact ? "py-1.5 text-xs" : "py-2 text-sm"
                  } ${index === highlight ? "bg-mint/40" : ""} ${
                    option.value === value ? "font-semibold text-primary" : "text-ink"
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
