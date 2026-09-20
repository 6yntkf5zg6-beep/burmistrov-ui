import { useMemo, useState, type ReactNode } from "react";
import { isWideScreen } from "../hooks/screen";
import { DetailModal } from "./DetailModal";

/** Сколько строк списка видно в кабинете до «См. больше». */
export const PREVIEW_ROWS = 4;

/**
 * Высота раскрытого списка — примерно шесть строк. Фиксированная, чтобы окно не меняло
 * размер от числа строк: при поиске список тает на глазах, и прыгающее окно раздражает.
 */
const LIST_VIEWPORT_HEIGHT = "24rem";

/**
 * Список, из которого в карточке показаны первые несколько строк, а остальное открывается
 * в окне. Строки рисует вызывающий, поэтому в окне они ровно те же, что и в карточке.
 *
 * @param searchIn текст, по которому ищут в раскрытом списке. Без него поиска нет — так
 *        устроены короткие списки вроде клиентов, где искать нечего.
 */
export function PreviewList<T>({
  items,
  renderRow,
  modalTitle,
  modalSubtitle,
  searchIn,
  searchPlaceholder = "Поиск по названию",
}: {
  items: T[];
  renderRow: (item: T) => ReactNode;
  modalTitle: string;
  modalSubtitle?: string;
  searchIn?: (item: T) => string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // На телефоне автофокус поднимает клавиатуру, и та закрывает половину только что
  // открытого окна: человек раскрыл блок, чтобы посмотреть список, а увидел клавиатуру.
  const [autoFocus] = useState(isWideScreen);

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!searchIn || !needle) return items;
    return items.filter((item) => searchIn(item).toLowerCase().includes(needle));
  }, [items, query, searchIn]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <ul className="mt-4 divide-y divide-line">{items.slice(0, PREVIEW_ROWS).map(renderRow)}</ul>

      {items.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
        >
          См. больше
        </button>
      )}

      {open && (
        <DetailModal
          title={modalTitle}
          subtitle={modalSubtitle}
          toolbar={
            searchIn && (
              <input
                autoFocus={autoFocus}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            )
          }
          bodyHeight={LIST_VIEWPORT_HEIGHT}
          onClose={close}
        >
          {found.length === 0 ? (
            <p className="text-sm text-ink/60">Ничего не нашлось.</p>
          ) : (
            <ul className="divide-y divide-line">{found.map(renderRow)}</ul>
          )}
        </DetailModal>
      )}
    </>
  );
}
