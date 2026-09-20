import { useEscapeClose } from "./useEscapeClose";
import { useScrollLock } from "./useScrollLock";

/**
 * Поведение модального окна: закрытие по Esc и замок прокрутки под ним.
 *
 * Вызывают все окна — от подтверждения до просмотра тренировки, — чтобы поведение не
 * разъезжалось от окна к окну. Выпадающим меню и подсказкам это не нужно: они не
 * перекрывают страницу, и замораживать её под ними было бы неожиданно. Им остаётся
 * {@link useEscapeClose}.
 *
 * Передайте {@code null}, когда окно закрыто: хук нельзя вызвать под условием,
 * а вот отключить — можно.
 */
export function useModal(onClose: (() => void) | null | undefined) {
  useEscapeClose(onClose);
  useScrollLock(Boolean(onClose));
}
