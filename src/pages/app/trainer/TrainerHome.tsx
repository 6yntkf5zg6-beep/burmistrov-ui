import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { inviteApi, trainerClientApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { InviteResponse, TrainerClientResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { InviteQrDialog } from "./InviteQrDialog";
import { PreviewList } from "../../../components/PreviewList";
import { TrainerScheduleCalendar } from "./TrainerScheduleCalendar";
import { TrainingProgramsSection } from "./TrainingProgramsSection";
import { WorkoutsSection } from "./WorkoutsSection";
import { ExercisesSection } from "./ExercisesSection";

const STATUS_LABEL: Record<TrainerClientResponse["status"], string> = {
  PENDING: "Ожидает подтверждения",
  ACTIVE: "Активен",
  ARCHIVED: "В архиве",
};

/**
 * Значки для круглых кнопок в строке ссылки. На телефоне подписи не помещались:
 * «Копировать» и «Удалить» выдавливали адрес и переносились на свою строку.
 */
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" strokeLinecap="round" />
    </svg>
  );
}

/** Галочка вместо значка копирования на пару секунд — подтверждение без подписи. */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16M10 4h4M9 7v11m6-11v11" strokeLinecap="round" />
      <path d="M6 7h12l-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7Z" strokeLinejoin="round" />
    </svg>
  );
}

/** Значок QR: три «глаза» по углам и щепоть модулей — узнаётся с первого взгляда. */
function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v.01M20 17v.01M14 20v.01M17 20v.01M20 20v.01" strokeLinecap="round" />
    </svg>
  );
}

export function TrainerHome() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<TrainerClientResponse[]>([]);
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteLabel, setInviteLabel] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingInvite, setConfirmingInvite] = useState<InviteResponse | null>(null);
  const [qrInvite, setQrInvite] = useState<InviteResponse | null>(null);

  function reload() {
    trainerClientApi.list().then(setClients).catch((e) => setError(apiErrorMessage(e)));
    inviteApi.list().then(setInvites).catch((e) => setError(apiErrorMessage(e)));
  }

  useEffect(reload, []);

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setCreatingInvite(true);
    setError(null);
    try {
      const invite = await inviteApi.create({ label: inviteLabel.trim() || undefined });
      setInvites((prev) => [invite, ...prev]);
      setInviteLabel("");
      setInviteFormOpen(false);
      await copyLink(invite);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось создать ссылку"));
    } finally {
      setCreatingInvite(false);
    }
  }

  /**
   * Убирает ссылку у тренера и на сервере. Вызывается уже после подтверждения:
   * спрашиваем всегда, потому что ссылка могла быть отправлена, и тогда клиент
   * упрётся в «Ссылка недействительна», не понимая почему.
   */
  async function removeInvite(invite: InviteResponse) {
    setDeletingId(invite.id);
    setError(null);
    try {
      await inviteApi.remove(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setConfirmingInvite(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось удалить ссылку"));
      setConfirmingInvite(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function copyLink(invite: InviteResponse) {
    try {
      await navigator.clipboard.writeText(invite.registrationUrl);
      setCopiedToken(invite.token);
      setTimeout(() => setCopiedToken((t) => (t === invite.token ? null : t)), 2000);
    } catch {
      // clipboard access can be denied by the browser — the link is still shown on screen
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Личный кабинет тренера</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">Мои клиенты</h1>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
        {/* Кнопка стоит в одной строке с заголовком: на телефоне подпись короче, иначе
            пара «заголовок + кнопка» не помещалась в ширину карточки. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Реферальные ссылки</h2>
          {!inviteFormOpen && (
            <Button variant="neutral" onClick={() => setInviteFormOpen(true)} className="!px-5 !py-2.5 !text-xs shrink-0">
              <CompactLabel short="Создать" full="Создать ссылку" />
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Регистрация в сервисе доступна только по ссылке. Имя и фамилию клиент укажет сам при регистрации;
          пометка нужна вам, чтобы не перепутать ещё не отправленные ссылки.
        </p>

        {inviteFormOpen && (
          // На телефоне поле занимает свою строку, кнопки — следующую: втроём в один ряд
          // они не помещались и переносились вразнобой. От sm и шире всё встаёт в строку.
          <form onSubmit={createInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Поле необязательное: пустая пометка — обычное дело, если ссылку отправляют сразу.
                Подсказка короткая: длинная обрезалась на середине слова на узком экране,
                а чем пометка полезна, сказано в описании блока выше. */}
            <input
              placeholder="Для кого (необязательно)"
              maxLength={100}
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              className="min-w-0 rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary sm:flex-1"
            />
            {/* Обёртка нужна только на телефоне — она держит кнопки в одной строке.
                От sm и шире display: contents убирает её из потока, и обе кнопки
                становятся соседями поля, как было раньше. */}
            <div className="flex gap-3 sm:contents">
              <Button
                type="submit"
                disabled={creatingInvite}
                className="!px-5 !py-2.5 !text-xs max-sm:flex-1 sm:shrink-0"
              >
                {creatingInvite ? "Создаём..." : <CompactLabel short="Создать" full="Создать ссылку" />}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setInviteFormOpen(false);
                  setInviteLabel("");
                }}
                className="rounded-full text-xs font-bold uppercase text-ink/50 transition hover:text-ink max-sm:flex-1 max-sm:border max-sm:border-line max-sm:py-2.5 sm:shrink-0"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {invites.length > 0 && (
          <ul className="mt-5 divide-y divide-line">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  {/* Без пометки строка начинается сразу с адреса — пустого заголовка не рисуем. */}
                  {inv.label && <p className="text-sm font-semibold text-ink">{inv.label}</p>}
                  <p className="truncate text-sm text-ink/70">{inv.registrationUrl}</p>
                  <p className="text-xs text-ink/50">
                    Действительна до {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {/* Две кнопки в одной группе: на узком экране они переносятся вместе,
                    а не разъезжаются по разным строкам карточки. */}
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrInvite(inv)}
                    aria-label="Показать QR-код"
                    title="Показать QR-код"
                    className="rounded-full bg-offwhite p-2 text-primary hover:bg-mint"
                  >
                    <QrIcon />
                  </button>
                  {/* На телефоне — круглый значок, как у QR; от sm и шире возвращается
                      прежняя кнопка с подписью. Элемент один, меняются форма и
                      содержимое, поэтому разметка не раздваивается. */}
                  <button
                    type="button"
                    onClick={() => copyLink(inv)}
                    aria-label="Копировать ссылку"
                    title="Копировать ссылку"
                    className="rounded-full bg-offwhite text-primary hover:bg-mint max-sm:p-2 sm:px-4 sm:py-1.5 sm:text-xs sm:font-bold sm:uppercase"
                  >
                    <span className="sm:hidden">
                      {copiedToken === inv.token ? <CheckIcon /> : <CopyIcon />}
                    </span>
                    <span className="hidden sm:inline">
                      {copiedToken === inv.token ? "Скопировано" : "Копировать"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingInvite(inv)}
                    disabled={deletingId === inv.id}
                    aria-label="Удалить ссылку"
                    title="Удалить ссылку"
                    className="rounded-full bg-offwhite text-coral hover:bg-coral/10 disabled:opacity-50 max-sm:p-2 sm:px-4 sm:py-1.5 sm:text-xs sm:font-bold sm:uppercase"
                  >
                    <span className="sm:hidden"><TrashIcon /></span>
                    <span className="hidden sm:inline">
                      {deletingId === inv.id ? "Удаляем..." : "Удалить"}
                    </span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {qrInvite && <InviteQrDialog invite={qrInvite} onClose={() => setQrInvite(null)} />}

      {confirmingInvite && (
        <ConfirmDialog
          title="Удалить ссылку?"
          description={
            (confirmingInvite.label ? `Пометка: «${confirmingInvite.label}». ` : "") +
            "Если вы уже отправили эту ссылку, клиент не сможет по ней зарегистрироваться."
          }
          busy={deletingId === confirmingInvite.id}
          onConfirm={() => removeInvite(confirmingInvite)}
          onCancel={() => setConfirmingInvite(null)}
        />
      )}

      <TrainerScheduleCalendar clients={clients} />

      <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-bold text-ink">Клиенты</h2>
        {clients.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">Пока нет добавленных клиентов.</p>
        ) : (
          <PreviewList
            items={clients}
            modalTitle="Клиенты"
            renderRow={(c) => (
              <li
                key={c.id}
                onClick={() => navigate(`/dashboard/trainer/clients/${c.clientId}`)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl py-3 hover:bg-offwhite"
              >
                <span className="min-w-0 flex-1 font-semibold text-ink">{c.clientName}</span>
                {/* Статус не переносим: «Ожидает подтверждения» в две строки читается хуже,
                    чем длинное имя клиента слева от него. */}
                <span className="shrink-0 whitespace-nowrap text-xs text-ink/50">
                  {STATUS_LABEL[c.status]}
                </span>
              </li>
            )}
          />
        )}
      </div>

      <TrainingProgramsSection />
      <WorkoutsSection />
      <ExercisesSection />
    </div>
  );
}
