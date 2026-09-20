import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/AuthContext";

type SiteEditing = {
  /** Тренер и только он может править содержимое публичных блоков. */
  canEdit: boolean;
  editing: boolean;
  setEditing: (value: boolean) => void;
};

const SiteEditingContext = createContext<SiteEditing>({ canEdit: false, editing: false, setEditing: () => {} });

export const useSiteEditing = () => useContext(SiteEditingContext);

/**
 * Режим правки публичных блоков. По умолчанию выключен: тренер видит страницу
 * так же, как посетитель, и сам решает, когда включить кнопки — иначе легко
 * промахнуться по «удалить», просто листая сайт.
 */
export function SiteEditingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canEdit = user?.role === "TRAINER";
  const [editing, setEditing] = useState(false);

  // Вышел из аккаунта или зашёл клиент — режим гасим, чтобы кнопки не остались висеть.
  useEffect(() => {
    if (!canEdit) setEditing(false);
  }, [canEdit]);

  return (
    <SiteEditingContext.Provider value={{ canEdit: Boolean(canEdit), editing, setEditing }}>
      {children}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className={`fixed bottom-6 right-6 z-40 h-11 rounded-full px-5 text-sm font-bold shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition ${
            editing ? "bg-coral text-white" : "bg-secondary text-white hover:brightness-110"
          }`}
        >
          {editing ? "Готово" : "Редактировать"}
        </button>
      )}
    </SiteEditingContext.Provider>
  );
}
