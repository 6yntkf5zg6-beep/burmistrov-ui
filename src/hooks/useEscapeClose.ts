import { useEffect, useRef } from "react";

/**
 * Закрытие по Esc для модальных окон и всплывающих панелей.
 *
 * Обработчик на окне один на всё приложение, а сами окна складываются в стек в
 * порядке открытия — Esc всегда закрывает то, что открыли последним, и не трогает
 * то, что под ним. Поэтому вложенные окна (превью картинки поверх формы, выбор
 * даты поверх назначения программы) закрываются по одному.
 *
 * Передайте {@code null}, когда окно закрыто: хук нельзя вызвать под условием,
 * а вот отключить — можно.
 */
export function useEscapeClose(onClose: (() => void) | null | undefined) {
  const latest = useRef(onClose);
  latest.current = onClose;

  const enabled = Boolean(onClose);

  useEffect(() => {
    if (!enabled) return;

    const entry = () => latest.current?.();
    push(entry);
    return () => remove(entry);
  }, [enabled]);
}

type Entry = () => void;

const stack: Entry[] = [];

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.preventDefault();
  top();
}

function push(entry: Entry) {
  if (stack.length === 0) {
    window.addEventListener("keydown", handleKeyDown);
  }
  stack.push(entry);
}

function remove(entry: Entry) {
  const index = stack.lastIndexOf(entry);
  if (index >= 0) {
    stack.splice(index, 1);
  }
  if (stack.length === 0) {
    window.removeEventListener("keydown", handleKeyDown);
  }
}
