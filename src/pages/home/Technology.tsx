import { useState } from "react";
import athleticWoman from "../../assets/home/athletic-woman.jpg";
import backMuscle from "../../assets/home/back-muscle.jpg";

const EFFECTS = [
  "Ликвидация болевых синдромов при остеохондрозе",
  "Восстановление после спортивных и иных травм",
  "Снижение артериального давления",
  "Развитие силовых качеств",
  "Развитие подвижности в суставах",
  "Снижение количества подкожного жира",
  "Коррекция пропорций тела",
  "Достижение и поддержание спортивной формы",
];

const TABS = [
  {
    label: "Цель",
    content:
      "Направленная стимуляция саногенеза — механизмов борьбы с болезнью, выздоровления и поддержания здоровья.",
  },
  {
    label: "Общие задачи",
    content:
      "Достижение и поддержание определённого уровня спортивной формы. Общие задачи тренировочной методики СТАН соответствуют общим задачам силовой тренировки и справедливы для всех методик двигательной реабилитации.",
  },
  {
    label: "Частные задачи",
    content:
      "Частные задачи тренировочных методик СТАН формулируются индивидуально в зависимости от диагноза, зоны поражения и общего состояния опорно-двигательного аппарата.",
  },
  {
    label: "Объект воздействия",
    content: "Скелетные мышцы, суставно-связочный аппарат и сердечно-сосудистая система тренирующегося.",
  },
  {
    label: "Предмет исследования",
    content: "Показатели силовых качеств, гибкости и функционального состояния до и после курса занятий.",
  },
  {
    label: "Формы проведения",
    content: "Индивидуальные и малогрупповые занятия под контролем специалиста с ведением дневника тренировок.",
  },
];

const PATENT_NOTES = [
  "Способ увеличения мышечной массы и силовых качеств (патент на изобретение № 2375095)",
  "Способ воздействия на мышцы спины (патент на изобретение № 2399397)",
  "Способ воздействия на мышцы верхней части спины (патент на изобретение № 2491907)",
  "Способ купирования боли в плечевых суставах (решение о выдаче патента на изобретение от 11.09.2013 по заявке № 2012129076/14)",
  "Тренажёр для развития длинных мышц спины (свидетельство на полезную модель № 18934)",
  "Тренировочное устройство для выполнения упражнений с внешним сопротивлением в положении лёжа (свидетельство на полезную модель № 25849)",
];

export function Technology() {
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="technology" className="bg-offwhite pb-[100px] pt-[90px]">
      <div className="mx-auto max-w-[1208px] px-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">О технологии</p>

        <div className="mt-8 grid gap-[30px] lg:grid-cols-[1fr_284px]">
          <div>
            <h2 className="text-[64px] font-black uppercase leading-none tracking-[0.06em] text-primary-dark">
              СТАН
            </h2>
            <p className="mt-3 max-w-[596px] text-[32px] font-bold leading-[1.15] text-ink">
              Спортивно-оздоровительная Технология Атлетической Направленности
            </p>

            <div className="mt-8 grid gap-[30px] sm:grid-cols-[285px_1fr]">
              <img
                src={backMuscle}
                alt=""
                className="h-[302px] w-full rounded-[15px] object-cover"
              />
              <div className="relative">
                <img
                  src={athleticWoman}
                  alt=""
                  className="h-[302px] w-full rounded-[15px] object-cover"
                />
                {/* Стеклянная плашка с акцией — лежит поверх фотографии, как в макете. */}
                <span className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-[15px] bg-white/25 py-[7px] pl-1 pr-5 backdrop-blur-xl">
                  <span aria-hidden className="grid h-[31px] w-[31px] place-items-center rounded-full bg-white/30">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-white">
                    <span className="block text-[16px] font-bold leading-none">Скидка</span>
                    <span className="mt-1 block text-[14px] leading-none">20% на 1 месяц</span>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Панель эффектов: тёмная колонка справа, как в макете. */}
          <div className="rounded-[15px] bg-primary-dark p-6 text-white">
            <p className="text-[18px] font-bold uppercase tracking-[0.12em]">Эффекты</p>
            <ul className="mt-5 space-y-[18px]">
              {EFFECTS.map((effect) => (
                <li key={effect} className="flex gap-2.5 text-[14px] leading-[1.25] text-white/90">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 shrink-0 text-white/60"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  {effect}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Карточка «Цель»: ярлык и вкладки лежат на верхней кромке карточки. */}
        <div className="relative mt-[90px]">
          <div className="flex flex-wrap items-end gap-[15px] pl-[25px]">
            <span className="grid h-[35px] min-w-[124px] place-items-center rounded-t-[15px] bg-white px-4 text-[18px] font-bold text-primary">
              {TABS[tab].label}
            </span>
            {TABS.map((t, i) => i === tab ? null : (
              <button
                key={t.label}
                type="button"
                onClick={() => setTab(i)}
                className="mb-[5px] flex items-center gap-1.5 rounded-[10px] bg-black/[0.04] px-[10px] py-[5px] text-[14px] text-ink/70 transition hover:bg-white"
              >
                <span className="text-[8px] text-primary" aria-hidden>
                  ◆
                </span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-[15px] rounded-tl-none bg-white px-[25px] pb-[45px] pt-[30px]">
            <p className="text-[16px] font-bold leading-[1.5] text-ink">{TABS[tab].content}</p>

            <p className="mt-6 text-[14px] leading-[1.5] text-ink/75">
              Конечным продуктом СТАН являются тренировочные методики двигательной реабилитации и развития
              физических качеств у лиц разного пола и возраста, нацеленные на ликвидацию симптомов хронических
              заболеваний, являющихся следствием процессов старения, а также спортивных, бытовых и иных травм
              опорно-двигательного аппарата.
            </p>

            {expanded && (
              <div className="mt-4 space-y-4 text-[14px] leading-[1.5] text-ink/75">
                <p>
                  Общие задачи СТАН соответствуют общим задачам силовой тренировки и справедливы для всех
                  методик двигательной реабилитации. Частные задачи тренировочных методик СТАН определяются
                  исходя из диагноза, зоны поражения и общего состояния опорно-двигательного аппарата.
                </p>
                <div>
                  <p className="font-bold text-ink">
                    Патенты автора являются ключевым звеном в достижении выраженного результата:
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {PATENT_NOTES.map((note) => (
                      <li key={note} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-2 text-[14px] font-semibold text-ink/60 hover:text-primary"
              >
                {expanded ? "Свернуть" : "Раскрыть"}
                <span aria-hidden>{expanded ? "\u2191" : "\u2193"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
