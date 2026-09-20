import { useEffect } from "react";

/**
 * Пока открыто окно, страница под ним не прокручивается.
 *
 * Одного {@code overflow: hidden} мало: Safari на iOS всё равно тянет страницу пальцем.
 * Поэтому тело страницы на время становится {@code position: fixed} и сдвигается вверх
 * на текущую прокрутку — со стороны ничего не меняется, но прокручивать больше нечего.
 * При закрытии позиция возвращается.
 *
 * Окна вкладываются друг в друга, поэтому замки считаются: страница отпускается, только
 * когда закрылось последнее окно. Счётчик общий на приложение — он про одно тело страницы,
 * а не про конкретное окно.
 */
let locks = 0;
let restore: (() => void) | null = null;

function lock() {
  const scrollY = window.scrollY;
  // Полоса прокрутки исчезнет вместе с прокруткой — без компенсации страница под окном
  // дёрнулась бы вправо на её ширину. На телефонах полосы нет и ширина равна нулю.
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  const { position, top, left, right, width, paddingRight } = document.body.style;

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

  restore = () => {
    Object.assign(document.body.style, { position, top, left, right, width, paddingRight });
    // Без instant сработало бы `scroll-behavior: smooth` из стилей, и страница поехала бы
    // к прежнему месту с анимацией — как будто её кто-то прокручивает сам.
    window.scrollTo({ top: scrollY, behavior: "instant" });
  };
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    locks += 1;
    if (locks === 1) lock();

    return () => {
      locks -= 1;
      if (locks === 0) {
        restore?.();
        restore = null;
      }
    };
  }, [active]);
}
