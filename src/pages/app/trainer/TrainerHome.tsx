import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { inviteApi, trainerClientApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { InviteResponse, TrainerClientResponse } from "../../../api/types";
import { Button } from "../../../components/Button";
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

export function TrainerHome() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<TrainerClientResponse[]>([]);
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
      const invite = await inviteApi.create({ firstName: inviteFirstName, lastName: inviteLastName });
      setInvites((prev) => [invite, ...prev]);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteFormOpen(false);
      await copyLink(invite);
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось создать ссылку"));
    } finally {
      setCreatingInvite(false);
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
        {/* Узкий экран: кнопка уезжала за край карточки — на телефоне она встаёт
            под заголовком, своей шириной, а не во всю строку. */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-ink">Реферальные ссылки</h2>
          {!inviteFormOpen && (
            <Button variant="neutral" onClick={() => setInviteFormOpen(true)} className="!px-5 !py-2.5 !text-xs shrink-0">
              Создать ссылку
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Регистрация в сервисе доступна только по ссылке. Укажите имя и фамилию клиента — они закрепятся за
          ссылкой и не смогут быть изменены при регистрации.
        </p>

        {inviteFormOpen && (
          <form onSubmit={createInvite} className="mt-4 flex flex-wrap items-center gap-3">
            <input
              required
              placeholder="Имя клиента"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
              className="min-w-0 flex-1 rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              required
              placeholder="Фамилия клиента"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
              className="min-w-0 flex-1 rounded-full border border-line bg-offwhite px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <Button type="submit" disabled={creatingInvite} className="!px-5 !py-2.5 !text-xs shrink-0">
              {creatingInvite ? "Создаём..." : "Создать ссылку"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setInviteFormOpen(false);
                setInviteFirstName("");
                setInviteLastName("");
              }}
              className="shrink-0 text-xs font-bold uppercase text-ink/50 hover:text-ink"
            >
              Отмена
            </button>
          </form>
        )}

        {invites.length > 0 && (
          <ul className="mt-5 divide-y divide-line">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {inv.firstName} {inv.lastName}
                  </p>
                  <p className="truncate text-sm text-ink/70">{inv.registrationUrl}</p>
                  <p className="text-xs text-ink/50">
                    Действительна до {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(inv)}
                  className="shrink-0 rounded-full bg-offwhite px-4 py-2 text-xs font-bold uppercase text-primary hover:bg-mint sm:py-1.5"
                >
                  {copiedToken === inv.token ? "Скопировано" : "Копировать"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
