import anatomy from "../assets/home/hero-anatomy.png";
import founder from "../assets/home/founder-photo.png";
import { Header } from "../components/Header";
import { AddPublicationButton, PublicationList, usePublications } from "./home/Publications";
import { SiteEditingProvider } from "./home/siteEditing";

const REGALIA =
  "лаборатории восстановительного лечения и реабилитации отдела клинической геронтологии Санкт-Петербургского института биорегуляции и геронтологии";

export function AuthorPage() {
  const { publications, setPublications } = usePublications();

  return (
    <SiteEditingProvider>
    <div className="relative bg-offwhite">
      <div className="absolute inset-x-0 top-0 z-10">
        <Header />
      </div>

      {/* Шапка страницы: портрет автора на зелёном, регалии справа — как в макете. */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "linear-gradient(168deg, #12a862 0%, #17a065 45%, #1a8f68 100%)" }}
      >
        <img
          aria-hidden
          src={anatomy}
          alt=""
          className="pointer-events-none absolute -top-10 left-[52%] w-[100%] max-w-none opacity-[0.07] mix-blend-color-dodge"
        />

        {/* Та же светлая панель, что и на главной: выделяет полосу с логотипом. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[112px] bg-white/[0.07] lg:top-[150px]"
        />

        <div className="relative mx-auto grid max-w-[1208px] items-end gap-8 px-6 pt-[150px] lg:grid-cols-[536px_1fr] lg:pt-[160px]">
          <img
            src={founder}
            alt="Бурмистров Дмитрий Алексеевич"
            // Нижний край портрета уходит под границу полосы: так срез кадра не виден.
            className="h-[360px] w-full self-end object-cover object-top lg:mb-[-97px] lg:h-[560px]"
          />

          <div className="pb-[55px] text-white lg:pl-[27px]">
            <h1 className="text-[40px] font-black leading-none">Бурмистров</h1>
            <p className="mt-2 text-[24px] font-semibold text-white/50">Дмитрий Алексеевич</p>

            <p className="mt-[39px] text-[18px] font-black uppercase leading-[1.4]">
              Доктор биологических наук
              <br />
              Кандидат педагогических наук
            </p>

            <p className="mt-[11px] max-w-[587px] text-[14px] leading-[1.2] text-white/85">
              <span className="font-bold">Ведущий научный сотрудник:</span> {REGALIA}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-primary-dark pb-[70px] pt-[60px]">
        <div className="mx-auto max-w-[1208px] px-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold uppercase tracking-[0.12em] text-white">Публикации автора</h2>
            <AddPublicationButton onAdded={setPublications} />
          </div>

          <div className="mt-8">
            <PublicationList publications={publications} onChanged={setPublications} />
          </div>
        </div>
      </section>

    </div>
    </SiteEditingProvider>
  );
}
