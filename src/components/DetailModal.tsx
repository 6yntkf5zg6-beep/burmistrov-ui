import type { ReactNode } from "react";
import { useModal } from "../hooks/useModal";

/**
 * Окно-карточка: заголовок, подпись, необязательное действие рядом с ним и прокручиваемое тело.
 *
 * Обработчик Esc живёт здесь, а не снаружи: окна вкладываются друг в друга (тренировка
 * поверх списка, программа поверх тренировки), и закрываться они должны по одному.
 */
export function DetailModal({
  title,
  subtitle,
  action,
  toolbar,
  bodyHeight,
  onClose,
  layer = "base",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Кнопка рядом с заголовком. Отодвинута от крестика, чтобы в них не промахивались. */
  action?: ReactNode;
  /** Полоса под шапкой — например, поиск. Не уезжает вместе с прокруткой тела. */
  toolbar?: ReactNode;
  /**
   * Фиксированная высота тела, чтобы окно не прыгало от числа строк. На низком экране
   * тело всё равно ужмётся: {@code min-h-0} оставляет его сжимаемым.
   */
  bodyHeight?: string;
  onClose: () => void;
  layer?: "base" | "top";
  children: ReactNode;
}) {
  useModal(onClose);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/40 px-3 py-6 sm:px-4 sm:py-8 ${
        layer === "top" ? "z-[60]" : "z-50"
      }`}
      onClick={onClose}
    >
      <div
        // На телефоне окно занимало весь экран и человек терял, откуда он его открыл.
        // Ограничение в 70% высоты возвращает контекст: под окном видно страницу.
        // dvh, а не vh: в Safari на iOS адресная строка то появляется, то прячется,
        // и vh считается по самому высокому состоянию — окно вылезало бы за экран.
        className="relative flex max-h-[70dvh] w-full max-w-2xl flex-col rounded-card bg-white p-5 shadow-card sm:max-h-full sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 p-1 text-ink/60 hover:text-ink sm:right-6 sm:top-6"
        >
          ✕
        </button>

        {/* На телефоне действие уходит под заголовок: рядом с ним заголовку оставалась
            половина строки, и он ломался на два-три ряда, а справа зияла пустота. */}
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink sm:text-xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 sm:mt-1">{action}</div>}
        </div>

        {toolbar && <div className="mt-4 shrink-0">{toolbar}</div>}

        <div
          className={`mt-4 min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-2 ${bodyHeight ? "" : "flex-1"}`}
          style={bodyHeight ? { height: bodyHeight } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
