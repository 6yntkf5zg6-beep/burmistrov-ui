import { useCallback, useEffect, useState } from "react";
import { clientWorkoutApi } from "../../../api/endpoints";
import { apiErrorMessage } from "../../../api/http";
import type { ClientWorkoutCardResponse } from "../../../api/types";
import { ClientScheduleCalendar } from "./ClientScheduleCalendar";
import { ClientStats } from "./ClientStats";
import { ClientWorkouts } from "./ClientWorkouts";

export function ClientHome() {
  // Тренировки загружаются здесь: календарь и список ниже должны показывать одно и то же,
  // иначе после открытия тренировки календарь остался бы со старым состоянием.
  const [cards, setCards] = useState<ClientWorkoutCardResponse[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [workoutsError, setWorkoutsError] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    try {
      setCards(await clientWorkoutApi.list());
      setWorkoutsError(null);
    } catch (e) {
      setWorkoutsError(apiErrorMessage(e, "Не удалось загрузить тренировки"));
    } finally {
      setWorkoutsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Личный кабинет</p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Мои тренировки</h1>
      </div>

      <ClientScheduleCalendar cards={cards} loading={workoutsLoading} />

      <ClientWorkouts
        cards={cards}
        loading={workoutsLoading}
        loadError={workoutsError}
        reload={loadWorkouts}
      />

      <ClientStats cards={cards} loading={workoutsLoading} />
    </div>
  );
}
