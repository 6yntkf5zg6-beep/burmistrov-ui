import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { clientProfileApi, trainerClientApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { ClientProfileResponse, TrainerClientResponse } from "../../../api/types";
import { ClientCalendar } from "./ClientCalendar";
import { HistorySection } from "./HistorySection";

const STATUS_LABEL: Record<TrainerClientResponse["status"], string> = {
  PENDING: "Ожидает подтверждения",
  ACTIVE: "Активен",
  ARCHIVED: "В архиве",
};

const GENDER_LABEL: Record<NonNullable<ClientProfileResponse["gender"]>, string> = {
  MALE: "Мужской",
  FEMALE: "Женский",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-2">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="text-sm font-semibold text-ink">{value || "Не указано"}</p>
    </div>
  );
}

export function TrainerClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const id = Number(clientId);

  const [relation, setRelation] = useState<TrainerClientResponse | null>(null);
  const [profile, setProfile] = useState<ClientProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Растёт при каждом изменении расписания в календаре — история перечитывает себя.
  const [scheduleVersion, setScheduleVersion] = useState(0);
  // Из истории можно попросить открыть правку дня: окно правки живёт в календаре.
  const [editRequest, setEditRequest] = useState<{ id: number; nonce: number } | null>(null);
  // Профиль на телефоне свёрнут: тренер приходит сюда к календарю, а рост и цель нужны
  // изредка. На широком экране сворачивать нечего — блок и так не мешает.
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    trainerClientApi
      .list()
      .then((list) => setRelation(list.find((c) => c.clientId === id) ?? null))
      .catch((e) => setError(apiErrorMessage(e)));
    clientProfileApi
      .getForTrainer(id)
      .then(setProfile)
      .catch((e) => setError(apiErrorMessage(e, "Не удалось загрузить профиль клиента")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-sm text-ink/50">Загрузка...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        {/* На телефоне ссылке нужна своя зона нажатия: одной строки текста мало. */}
        <Link to="/dashboard" className="inline-block py-2 text-sm font-semibold text-primary sm:py-0">
          ← Мои клиенты
        </Link>
        <div className="flex flex-wrap items-center gap-3 sm:mt-2">
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{relation?.clientName ?? "Клиент"}</h1>
          {relation && (
            <span className="rounded-full bg-offwhite px-3 py-1 text-xs font-semibold uppercase text-primary">
              {STATUS_LABEL[relation.status]}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      {profile && (
        <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink">Информация о клиенте</h2>

          {/* Две колонки на телефоне оставляли «Цель» и «Заметки о здоровье» по полтора
              слова в строке — там поля идут одно под другим. */}
          <div
            className={`mt-2 grid-cols-1 gap-x-8 sm:grid sm:grid-cols-2 ${
              profileOpen ? "grid" : "hidden"
            }`}
          >
            <Field label="Дата рождения" value={profile.birthDate} />
            <Field label="Пол" value={profile.gender ? GENDER_LABEL[profile.gender] : undefined} />
            <Field label="Рост, см" value={profile.heightCm != null ? String(profile.heightCm) : undefined} />
            <Field label="Вес, кг" value={profile.weightKg != null ? String(profile.weightKg) : undefined} />
            <Field label="Цель" value={profile.goal} />
            <Field label="Заметки о здоровье" value={profile.healthNotes} />
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="mt-2 py-2 text-xs font-semibold text-primary hover:underline sm:hidden"
          >
            {profileOpen ? "Свернуть" : "См. больше"}
          </button>
        </div>
      )}

      <ClientCalendar
        clientId={id}
        onScheduleChange={() => setScheduleVersion((version) => version + 1)}
        editRequest={editRequest}
      />

      <HistorySection
        clientId={id}
        refreshToken={scheduleVersion}
        onEditWorkout={(workoutId) => setEditRequest({ id: workoutId, nonce: Date.now() })}
      />
    </div>
  );
}
