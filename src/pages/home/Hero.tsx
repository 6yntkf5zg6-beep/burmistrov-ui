import anatomy from "../../assets/home/hero-anatomy.png";
import torso from "../../assets/home/hero-torso.png";
import {
  CANVAS_H,
  CANVAS_W,
  CHIPS,
  HERO_FRAME_WIDTH,
  HERO_MENU_HOME,
  PHOTOS,
  RING_RIGHT,
  pct,
} from "./heroData";

/** Ширина самого длинного пункта меню — по ней центрируем колонку. */
const MENU_WIDTH = 170;

/** Доля расстояния «правый край кольца → правый край блока», на которой стоит меню. */
const MENU_POSITION = 0.7;

/**
 * Подпись коллажа. Все размеры заданы в `em`, поэтому плашка целиком
 * масштабируется вместе с базовым кеглем родителя (в макете это 14px).
 */
function Chip({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="flex items-center gap-[0.71em] rounded-[1.07em] bg-white/25 py-[0.5em] pl-[0.29em] pr-[1.14em] backdrop-blur-xl">
      <span aria-hidden className="grid h-[2.21em] w-[2.21em] shrink-0 place-items-center rounded-full bg-white/30">
        <svg width="1.21em" height="1.21em" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="whitespace-nowrap text-white">
        <span className="block text-[1em] font-bold leading-none">{title}</span>
        <span className="mt-[0.15em] block text-[0.71em] leading-none">{subtitle}</span>
      </span>
    </span>
  );
}

/**
 * Главный экран. Коллаж живёт на холсте макета 1440×1071 и целиком помещается
 * в высоту окна: ширина ограничена высотой экрана, а кегль внутри задан в cqw —
 * поэтому подписи и меню уменьшаются вместе с фотографиями, а не «разъезжаются».
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-primary"
      style={{ backgroundImage: "linear-gradient(168deg, #12a862 0%, #17a065 45%, #1a8f68 100%)" }}
    >
      {/* «Нервная» графика и мягкие круги — фактура фона из макета. */}
      <img
        aria-hidden
        src={anatomy}
        alt=""
        className="pointer-events-none absolute -top-6 left-[58%] w-[108%] max-w-none opacity-[0.06] mix-blend-color-dodge"
      />
      <img
        aria-hidden
        src={anatomy}
        alt=""
        className="pointer-events-none absolute -left-[46%] -top-2 w-[108%] max-w-none opacity-[0.08] mix-blend-color-dodge"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-7%] top-[-23%] aspect-square w-[61%] rounded-full bg-white/[0.04]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[57%] top-[30%] aspect-square w-[61%] rounded-full bg-white/[0.04]"
      />

      {/*
        Светлая панель из макета: начинается под шапкой, поэтому полоса с логотипом
        читается как более тёмная зелёная. Отступ в пикселях, а не в долях холста:
        шапка не масштабируется, и полоса должна держаться именно её высоты.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[112px] bg-white/[0.07] lg:top-[150px]"
      />

      <div
        className="@container relative mx-auto hidden lg:block"
        style={{ width: HERO_FRAME_WIDTH, aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        {/*
          Кегль задан во вложенном слое: элемент с container-type не может
          опрашивать сам себя, поэтому на самом холсте cqw считался бы от окна,
          а не от холста. 14px при ширине холста 1440 — базовый кегль из макета.
        */}
        <div className="absolute inset-0" style={{ fontSize: `${(14 / CANVAS_W) * 100}cqw` }}>
          {/* Анатомическая иллюстрация в центре кольца — как в макете. */}
          <img
            aria-hidden
            src={torso}
            alt=""
            className="absolute object-contain opacity-90"
            style={{
              left: pct(282, CANVAS_W),
              top: pct(240, CANVAS_H),
              width: pct(448, CANVAS_W),
              height: pct(335, CANVAS_H),
              // Исходник — прямоугольный кроп; растушёвываем края, иначе виден срез.
              maskImage:
                "linear-gradient(to bottom, #000 72%, transparent 99%), linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 4%)",
              maskComposite: "intersect",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 72%, transparent 99%), linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 4%)",
              WebkitMaskComposite: "source-in",
            }}
          />

          {PHOTOS.map((photo) => (
          <img
            key={photo.key}
            src={photo.src}
            alt=""
            className="absolute object-contain"
            style={{
              left: pct(photo.x, CANVAS_W),
              top: pct(photo.y, CANVAS_H),
              width: pct(photo.w, CANVAS_W),
              height: pct(photo.h, CANVAS_H),
              filter: "drop-shadow(0 18px 18px rgba(0,0,0,0.22))",
            }}
          />
        ))}

        {CHIPS.map((chip) => (
          <div
            key={chip.title}
            className="absolute"
            style={{ left: pct(chip.x, CANVAS_W), top: pct(chip.y, CANVAS_H) }}
          >
            <Chip title={chip.title} subtitle={chip.subtitle} />
          </div>
        ))}

        <nav
          className="absolute flex flex-col items-end gap-[3.14em] text-[1.43em] text-white"
          style={{
            // Колонка стоит на 70% расстояния от правого края кольца до края блока.
            right: pct(
              CANVAS_W - (RING_RIGHT + (CANVAS_W - RING_RIGHT) * MENU_POSITION) - MENU_WIDTH / 2,
              CANVAS_W,
            ),
            top: pct(275, CANVAS_H),
          }}
        >
          {HERO_MENU_HOME.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="rounded-[0.75em] px-[0.8em] py-[0.4em] uppercase leading-none transition hover:bg-white/15"
            >
              {item.label}
            </a>
          ))}
          </nav>
        </div>
      </div>

      {/* Узкий экран: коллаж не читается, показываем тот же смысл списком. */}
      <div className="relative px-6 pb-12 pt-[150px] text-[14px] lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          {PHOTOS.slice(0, 6).map((photo) => (
            <img key={photo.key} src={photo.src} alt="" className="h-24 w-full object-contain" />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <Chip key={chip.title} title={chip.title} subtitle={chip.subtitle} />
          ))}
        </div>
      </div>
    </section>
  );
}
