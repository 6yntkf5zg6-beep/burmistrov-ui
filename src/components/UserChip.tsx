import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Плашка авторизованного пользователя: фамилия, имя и выход.
 * Одна и та же и в шапке сайта, и в личном кабинете — чтобы человек узнавал её
 * на обеих сторонах. На публичных страницах имя кликабельно и ведёт в кабинет.
 */
export function UserChip({ to }: { to?: string }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const name = (
    <span className="block text-right leading-tight">
      <span className="block text-sm font-bold text-ink">{user.lastName}</span>
      <span className="block text-xs text-ink/60">{user.firstName}</span>
    </span>
  );

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full bg-white/95 px-4 py-2">
      {to ? (
        <Link to={to} className="transition hover:opacity-70">
          {name}
        </Link>
      ) : (
        name
      )}
      <button
        type="button"
        onClick={() => logout()}
        aria-label="Выйти"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary transition hover:bg-mint"
      >
        ⏻
      </button>
    </div>
  );
}
