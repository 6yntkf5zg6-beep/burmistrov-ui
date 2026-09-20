/**
 * Подпись, которая на телефоне короче.
 *
 * Обе версии лежат в разметке, видна одна: так подпись меняется в тот же миг, что и ширина
 * экрана, без слушателя `resize` и без перерисовки при повороте телефона. Читалкам экрана
 * достаётся только видимый вариант — скрытый спрятан через `display: none`.
 */
export function CompactLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}
