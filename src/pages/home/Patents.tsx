import { useEffect, useRef, useState } from "react";
import { siteContentApi, uploadApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/http";
import type { MoveDirection, PatentResponse } from "../../api/types";
import { DetailModal } from "../../components/DetailModal";
import { OrderControls } from "../../components/OrderControls";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useSiteEditing } from "./siteEditing";

/** Пока скана нет — показываем бланк с номером, а не пустое место. */
function PatentCard({ patent }: { patent: PatentResponse }) {
  if (patent.scanUrl) {
    return (
      <img
        src={patent.scanUrl}
        alt={patent.number ? `Патент ${patent.number}` : "Патент"}
        className="h-[381px] w-[255px] rounded-[10px] bg-white object-cover"
      />
    );
  }
  // Скана нет только у записей, заведённых до перехода на «патент — это скан».
  return (
    <div className="flex h-[381px] w-[255px] flex-col items-center justify-center gap-4 rounded-[10px] bg-white px-7 text-center">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40">Российская Федерация</span>
      <span className="h-px w-16 bg-ink/15" />
      <span className="text-2xl font-black uppercase tracking-[0.2em] text-primary-dark">Патент</span>
      {patent.number && <span className="text-sm font-bold text-ink/70">{patent.number}</span>}
      {patent.title && <p className="text-[13px] leading-snug text-ink/60">{patent.title}</p>}
    </div>
  );
}

function PatentForm({
  initialScanUrl,
  onSubmit,
  onClose,
  title,
}: {
  initialScanUrl: string | null;
  onSubmit: (scanUrl: string) => Promise<void>;
  onClose: () => void;
  title: string;
}) {
  const [scanUrl, setScanUrl] = useState(initialScanUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadApi.upload(file);
      setScanUrl(url);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось загрузить документ"));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!scanUrl) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(scanUrl);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить"));
      setBusy(false);
    }
  }

  return (
    <DetailModal title={title} onClose={onClose}>
      <div className="flex items-center justify-center gap-4">
        {scanUrl ? (
          <img src={scanUrl} alt="" className="h-[150px] w-[100px] shrink-0 rounded-[8px] border border-line object-cover" />
        ) : (
          <div className="grid h-[150px] w-[100px] shrink-0 place-items-center rounded-[8px] border border-dashed border-line px-2 text-center text-xs text-ink/40">
            документ не выбран
          </div>
        )}

        <div>
          {/* Системный input file подписан по-английски и не стилизуется — прячем его за кнопкой. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {busy ? "Загружаю…" : scanUrl ? "Заменить документ" : "Выбрать документ"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-center text-sm text-coral">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink/60 hover:text-ink">
          Отмена
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !scanUrl}
          className="rounded-[10px] bg-secondary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </DetailModal>
  );
}

export function Patents() {
  const { canEdit, editing } = useSiteEditing();
  const [patents, setPatents] = useState<PatentResponse[]>([]);
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; patent: PatentResponse } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<PatentResponse | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    siteContentApi.listPatents().then(setPatents).catch(() => setPatents([]));
  }, []);

  async function move(id: number, direction: MoveDirection) {
    setBusy(true);
    try {
      setPatents(await siteContentApi.movePatent(id, direction));
    } finally {
      setBusy(false);
    }
  }

  /** Вызывается уже после подтверждения — само окно живёт в состоянии рядом. */
  async function remove(patent: PatentResponse) {
    setBusy(true);
    try {
      await siteContentApi.deletePatent(patent.id);
      setPatents(await siteContentApi.listPatents());
    } finally {
      setBusy(false);
      setConfirmingDelete(null);
    }
  }

  function scroll(dir: 1 | -1) {
    trackRef.current?.scrollBy({ left: dir * 285, behavior: "smooth" });
  }

  if (!patents.length && !canEdit) return null;

  return (
    <section id="patents" className="bg-primary-dark pt-[60px]">
      <div className="mx-auto max-w-[1208px] px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold uppercase tracking-[0.12em] text-white">Патенты</h2>
          {editing && (
            <button
              type="button"
              onClick={() => setForm({ mode: "create" })}
              className="rounded-[10px] border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              + Добавить патент
            </button>
          )}
        </div>

        <div className="relative mt-8 flex items-start gap-4">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Назад"
            className="mt-44 hidden h-6 w-6 shrink-0 place-items-center rounded-full text-xl text-white/70 hover:text-white lg:grid"
          >
            ‹
          </button>

          <div ref={trackRef} className="flex gap-[30px] overflow-x-auto pb-2 [scrollbar-width:none]">
            {patents.map((patent) => (
              <div key={patent.id} className="relative shrink-0">
                <PatentCard patent={patent} />
                {editing && (
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-[10px] bg-white/95 p-1 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]">
                    <OrderControls
                      axis="horizontal"
                      disabled={busy}
                      onUp={() => void move(patent.id, "UP")}
                      onDown={() => void move(patent.id, "DOWN")}
                      onEdit={() => setForm({ mode: "edit", patent })}
                      onDelete={() => setConfirmingDelete(patent)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Вперёд"
            className="mt-44 hidden h-6 w-6 shrink-0 place-items-center rounded-full text-xl text-white/70 hover:text-white lg:grid"
          >
            ›
          </button>
        </div>
      </div>

      {form?.mode === "create" && (
        <PatentForm
          title="Новый патент"
          initialScanUrl={null}
          onClose={() => setForm(null)}
          onSubmit={async (scanUrl) => {
            await siteContentApi.createPatent({ scanUrl });
            setPatents(await siteContentApi.listPatents());
          }}
        />
      )}

      {form?.mode === "edit" && (
        <PatentForm
          title="Патент"
          initialScanUrl={form.patent.scanUrl}
          onClose={() => setForm(null)}
          onSubmit={async (scanUrl) => {
            await siteContentApi.updatePatent(form.patent.id, { scanUrl });
            setPatents(await siteContentApi.listPatents());
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Удалить патент?"
          description={`«${confirmingDelete.title}» пропадёт со страницы вместе с прикреплённым сканом.`}
          busy={busy}
          onConfirm={() => void remove(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
        />
      )}
    </section>
  );
}
