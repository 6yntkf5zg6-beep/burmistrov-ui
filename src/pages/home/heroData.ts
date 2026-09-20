import ex1a from "../../assets/home/exercise-1a.png";
import ex1b from "../../assets/home/exercise-1b.png";
import ex2a from "../../assets/home/exercise-2a.png";
import ex3a from "../../assets/home/exercise-3a.png";
import ex3b from "../../assets/home/exercise-3b.png";
import ex4a from "../../assets/home/exercise-4a.png";
import ex4b from "../../assets/home/exercise-4b.png";
import ex5a from "../../assets/home/exercise-5a.png";
import ex5b from "../../assets/home/exercise-5b.png";
import ex6b from "../../assets/home/exercise-6b.png";
import ex7a from "../../assets/home/exercise-7a.png";
import ex8a from "../../assets/home/exercise-8a.png";

/** Холст коллажа: все координаты ниже сняты с него и переводятся в проценты. */
export const CANVAS_W = 1440;
export const CANVAS_H = 863;

export const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/** Дальше этой ширины коллаж не растёт — на широком мониторе встаёт по центру. */
export const HERO_MAX_WIDTH = 1920;

/**
 * Ширина холста коллажа. Привязана к ШИРИНЕ окна, а не к высоте: композиция
 * на любом мониторе одна и та же, просто крупнее или мельче целиком, и поля
 * по бокам — всегда одна и та же доля ширины. Плата за это: на низком окне
 * низ блока уходит за сгиб, это осознанный размен.
 *
 * Шапка использует ту же величину — иначе логотип и меню разъезжаются.
 */
export const HERO_FRAME_WIDTH = `min(100%, ${HERO_MAX_WIDTH}px)`;

/** Фотографии коллажа — вырезки без фона, кольцевая композиция из макета. */
export const PHOTOS = [
  { key: "7a", src: ex7a, x: 457, y: 87, w: 121, h: 127 },
  { key: "8a", src: ex8a, x: 599, y: 134, w: 149, h: 154 },
  { key: "1a", src: ex1a, x: 360, y: 144, w: 88, h: 128 },
  { key: "4b", src: ex4b, x: 700, y: 224, w: 90, h: 127 },
  { key: "5b", src: ex5b, x: 238, y: 235, w: 110, h: 124 },
  { key: "3a", src: ex3a, x: 729, y: 360, w: 111, h: 107 },
  { key: "3b", src: ex3b, x: 172, y: 390, w: 131, h: 77 },
  { key: "1b", src: ex1b, x: 238, y: 486, w: 111, h: 104 },
  { key: "2a", src: ex2a, x: 700, y: 496, w: 104, h: 97 },
  { key: "5a", src: ex5a, x: 574, y: 512, w: 103, h: 137 },
  { key: "6b", src: ex6b, x: 366, y: 576, w: 95, h: 98 },
  { key: "4a", src: ex4a, x: 473, y: 597, w: 90, h: 131 },
];

/** Правый край кольца по холсту. На него опирается положение меню. */
export const RING_RIGHT = 840;

/** Стеклянные подписи поверх коллажа: положение едет вместе с кольцом, кегль — нет. */
export const CHIPS = [
  { x: 293, y: 270, title: "Увеличение", subtitle: "подвижности грудной клетки" },
  { x: 518, y: 267, title: "Ликвидация", subtitle: "болевых синдромов" },
  { x: 247, y: 362, title: "ПостCOVIDная", subtitle: "реабилитация" },
  { x: 575, y: 434, title: "Развитие", subtitle: "силовых качеств" },
  { x: 298, y: 479, title: "Купирование", subtitle: "болей в спине" },
  { x: 534, y: 657, title: "Осанка", subtitle: "восстановление" },
  { x: 271, y: 684, title: "Восстановление", subtitle: "подвижности суставов" },
];

export type HeroMenuItem = { to: string; label: string };

/** Вертикальное меню в коллаже. На главной это якоря, на внутренних — маршруты. */
export const HERO_MENU_HOME: HeroMenuItem[] = [
  { to: "#about", label: "Об авторе" },
  { to: "#technology", label: "Технология" },
  { to: "#patents", label: "Патенты" },
  { to: "#publications", label: "Информация" },
];
