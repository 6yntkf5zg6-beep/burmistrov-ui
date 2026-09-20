import founder from "../../assets/home/founder-photo.png";
import gym from "../../assets/home/gym-loft.jpg";

const REGALIA =
  "Ведущий научный сотрудник лаборатории восстановительного лечения и реабилитации отдела клинической геронтологии Санкт-Петербургского института биорегуляции и геронтологии";

/**
 * Полоса «Об авторе»: фотография зала уходит в тёмно-зелёную заливку, портрет стоит
 * на нижней кромке полосы — как в макете, где он подрезан её границей.
 */
export function AboutAuthor() {
  return (
    <section id="about" className="relative overflow-hidden bg-[#30584a] text-white">
      <img src={gym} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#30584a]/85" />

      <div className="relative mx-auto max-w-[1208px] px-6 pt-[40px]">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">Об авторе</p>

        <div className="mt-6 grid items-end gap-8 lg:grid-cols-[536px_1fr]">
          <img
            src={founder}
            alt="Бурмистров Дмитрий Алексеевич"
            // Нижний край портрета уходит под границу полосы: так срез кадра не виден.
            className="h-[360px] w-full self-end object-cover object-top lg:mb-[-97px] lg:h-[560px]"
          />

          <div className="pb-[55px] lg:pl-[27px]">
            <h2 className="text-[40px] font-black leading-none">Бурмистров</h2>
            <p className="mt-2 text-[24px] font-semibold text-white/50">Дмитрий Алексеевич</p>

            <p className="mt-[39px] text-[18px] font-black uppercase leading-[1.4]">
              Доктор биологических наук
              <br />
              Кандидат педагогических наук
            </p>

            <p className="mt-[11px] max-w-[587px] text-[14px] leading-[1.2] text-white/85">
              <span className="font-bold">Ведущий научный сотрудник:</span> {REGALIA.replace("Ведущий научный сотрудник ", "")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
