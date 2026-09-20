import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { siteContentApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/http";
import type { MoveDirection, PublicationResponse } from "../../api/types";
import { DetailModal } from "../../components/DetailModal";
import { OrderControls } from "../../components/OrderControls";
import { useSiteEditing } from "./siteEditing";

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5Z" strokeLinejoin="round" />
    </svg>
  );
}

type Draft = { title: string; authors: string; annotation: string };

const EMPTY: Draft = { title: "", authors: "", annotation: "" };

function PublicationForm({
  initial,
  title,
  onSubmit,
  onClose,
}: {
  initial: Draft;
  title: string;
  onSubmit: (draft: Draft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = "w-full rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-primary";
  const filled = draft.title.trim() && draft.authors.trim() && draft.annotation.trim();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить"));
      setBusy(false);
    }
  }

  return (
    <DetailModal title={title} onClose={onClose}>
      <label className="block text-sm font-semibold text-ink/70">Название</label>
      <textarea
        className={`${field} min-h-[70px]`}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />

      <label className="mt-4 block text-sm font-semibold text-ink/70">Выходные данные</label>
      <textarea
        className={`${field} min-h-[60px]`}
        value={draft.authors}
        onChange={(e) => setDraft({ ...draft, authors: e.target.value })}
        placeholder="Авторы // Журнал. — Год. — №. — С."
      />

      <label className="mt-4 block text-sm font-semibold text-ink/70">Аннотация</label>
      <textarea
        className={`${field} min-h-[160px]`}
        value={draft.annotation}
        onChange={(e) => setDraft({ ...draft, annotation: e.target.value })}
      />

      {error && <p className="mt-3 text-sm text-coral">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink/60 hover:text-ink">
          Отмена
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !filled}
          className="rounded-[10px] bg-secondary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </DetailModal>
  );
}

function PublicationCard({
  publication,
  onOpen,
  actionLabel,
}: {
  publication: PublicationResponse;
  onOpen: () => void;
  /** В режиме правки карточка ведёт в редактор, поэтому и подпись другая. */
  actionLabel: string;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer rounded-[15px] bg-white px-5 py-5 text-left transition hover:shadow-[0_14px_34px_-18px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex gap-2.5 text-primary">
        <span className="mt-0.5 shrink-0">
          <FileIcon />
        </span>
        <h3 className="text-[16px] font-bold leading-tight text-ink">{publication.title}</h3>
      </div>
      <p className="mt-2 pl-[34px] text-[12px] text-ink/60">{publication.authors}</p>
      <p className="mt-3 pl-[34px] text-[12px] font-bold text-ink/70">Аннотация</p>
      <p className="mt-1 line-clamp-2 pl-[34px] text-[12px] leading-[1.35] text-ink/70">{publication.annotation}</p>
      <p className="mt-2 pl-[34px] text-[12px] font-semibold text-primary">
        {actionLabel}
      </p>
    </article>
  );
}

/**
 * Список публикаций. Карточка показывает две строки аннотации, полный текст читается
 * в окне с прокруткой. Тренер в режиме правки получает под каждой карточкой кнопки.
 */
export function PublicationList({
  publications,
  onChanged,
}: {
  publications: PublicationResponse[];
  onChanged: (next: PublicationResponse[]) => void;
}) {
  const { editing } = useSiteEditing();
  const [open, setOpen] = useState<PublicationResponse | null>(null);
  const [edited, setEdited] = useState<PublicationResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function move(id: number, direction: MoveDirection) {
    setBusy(true);
    try {
      onChanged(await siteContentApi.movePublication(id, direction));
    } finally {
      setBusy(false);
    }
  }

  async function remove(publication: PublicationResponse) {
    if (!window.confirm("Удалить публикацию?")) return;
    setBusy(true);
    try {
      await siteContentApi.deletePublication(publication.id);
      onChanged(await siteContentApi.listPublications());
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        {publications.map((pub) => (
          <div key={pub.id} className="relative">
            <PublicationCard publication={pub} onOpen={() => (editing ? setEdited(pub) : setOpen(pub))}
              actionLabel={editing ? "Редактировать →" : "Читать полностью →"}
            />
            {editing && (
              <div
                className="absolute right-4 top-4 rounded-[10px] bg-white/95 p-1 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
              >
                <OrderControls
                  disabled={busy}
                  onUp={() => void move(pub.id, "UP")}
                  onDown={() => void move(pub.id, "DOWN")}
                  onEdit={() => setEdited(pub)}
                  onDelete={() => void remove(pub)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {open && (
        <DetailModal title={open.title} subtitle={open.authors} onClose={() => setOpen(null)}>
          <p className="text-[13px] font-bold text-ink/70">Аннотация</p>
          <p className="whitespace-pre-line text-[14px] leading-[1.55] text-ink/80">{open.annotation}</p>
        </DetailModal>
      )}

      {edited && (
        <PublicationForm
          title="Публикация"
          initial={{ title: edited.title, authors: edited.authors, annotation: edited.annotation }}
          onClose={() => setEdited(null)}
          onSubmit={async (draft) => {
            await siteContentApi.updatePublication(edited.id, draft);
            onChanged(await siteContentApi.listPublications());
          }}
        />
      )}
    </>
  );
}

/** Загружает список публикаций один раз и отдаёт его в список и в кнопку добавления. */
export function usePublications() {
  const [publications, setPublications] = useState<PublicationResponse[]>([]);

  useEffect(() => {
    siteContentApi.listPublications().then(setPublications).catch(() => setPublications([]));
  }, []);

  return { publications, setPublications };
}

export function AddPublicationButton({
  onAdded,
  tone = "dark",
}: {
  onAdded: (next: PublicationResponse[]) => void;
  tone?: "dark" | "light";
}) {
  const { editing } = useSiteEditing();
  const [open, setOpen] = useState(false);
  if (!editing) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          tone === "dark"
            ? "rounded-[10px] border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            : "rounded-[10px] border border-line px-4 py-2 text-sm font-semibold text-ink/70 hover:border-primary hover:text-primary"
        }
      >
        + Добавить публикацию
      </button>

      {open && (
        <PublicationForm
          title="Новая публикация"
          initial={EMPTY}
          onClose={() => setOpen(false)}
          onSubmit={async (draft) => {
            await siteContentApi.createPublication(draft);
            onAdded(await siteContentApi.listPublications());
          }}
        />
      )}
    </>
  );
}

export function Publications() {
  const { publications, setPublications } = usePublications();
  const { canEdit } = useSiteEditing();

  if (!publications.length && !canEdit) return null;

  return (
    <section id="publications" className="bg-primary-dark pb-[90px] pt-[80px]">
      <div className="mx-auto max-w-[1208px] px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold uppercase tracking-[0.12em] text-white">Публикации автора</h2>
          <AddPublicationButton onAdded={setPublications} />
        </div>

        <div className="mt-8">
          <PublicationList publications={publications} onChanged={setPublications} />
        </div>

        <div className="mt-5 flex justify-end">
          <Link to="/author" className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            Смотреть все
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
