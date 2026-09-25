import { createPortal } from "react-dom";

import { Button } from "./Button";
import { useModal } from "../hooks/useModal";

/**
 * Подтверждение действия, которое нельзя отменить.
 *
 * Заменяет `window.confirm`: тот рисуется браузером, на каждой системе выглядит
 * по-своему и не умеет ни подсветить опасное действие, ни показать, что запрос уже
 * пошёл. Оформление взято у остальных окон проекта, поведение — из {@link useModal}:
 * закрытие по Esc и замок прокрутки под окном.
 *
 * Кнопка отмены получает фокус первой: если окно открылось случайно, Enter не должен
 * оказаться согласием.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Красная кнопка согласия — для того, что стирает данные. */
  danger?: boolean;
  /** Запрос уже идёт: обе кнопки заблокированы, чтобы не отправить его дважды. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useModal(onCancel);

  // Окно рисуется прямо в body, мимо всей разметки страницы. Модальному окну незачем
  // зависеть от того, внутри какого блока его вызвали: любой родитель с transform,
  // filter или contain превратил бы «на весь экран» в «на размер этого блока».
  return createPortal(
    <div
      // Высота задана явно вместо inset-0. С одним только bottom: 0 затемнение
      // оказывалось на 32 пикселя короче окна и внизу оставалась светлая полоса.
      // dvh — это высота видимой области, она же учитывает исчезающие панели браузера
      // на телефоне, поэтому полосы не будет и там.
      className="fixed inset-x-0 top-0 z-50 h-dvh flex items-center justify-center bg-black/40 px-3 sm:px-4"
      onClick={onCancel}
    >
      {/* Тени нет намеренно: shadow-card уходит на 40px вниз и поверх затемнения
          читается не как тень, а как тёмная полоса под окном. Белую карточку на
          тёмном фоне и так видно. */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-card bg-white p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description && <p className="mt-2 text-sm text-ink/70">{description}</p>}

        {/* Порядок в разметке — «Отмена», затем действие. На телефоне колонка
            развёрнута, поэтому сверху оказывается действие, а отмена под ним;
            на широком экране получается привычное «Отмена» слева от кнопки справа.
            Ширина кнопок по содержимому: в окне из двух слов растягивать их не на что. */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            autoFocus
            type="button"
            variant="neutral"
            onClick={onCancel}
            disabled={busy}
            className="!px-5 !py-2.5 !text-xs !border !border-line"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "coral" : "primary"}
            onClick={onConfirm}
            disabled={busy}
            className="!px-5 !py-2.5 !text-xs"
          >
            {busy ? "Выполняем..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
