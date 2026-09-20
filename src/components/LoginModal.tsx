import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../api/http";
import { useModal } from "../hooks/useModal";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 20 16-16" strokeLinecap="round" />}
    </svg>
  );
}

const FIELD =
  "h-[34px] w-full rounded-[8px] bg-offwhite pl-[34px] pr-9 text-[13px] text-ink outline-none placeholder:text-ink/40 focus:ring-1 focus:ring-primary/40";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useModal(onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось выполнить вход"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-[296px] rounded-[15px] bg-white px-[25px] py-[22px] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 text-ink/35 hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="text-center text-[15px] font-bold text-ink">Добро пожаловать!</h2>
        <p className="mx-auto mt-1 max-w-[210px] text-center text-[11px] leading-[1.35] text-ink/55">
          Пожалуйста введите ваши данные для входа в систему
        </p>

        <form onSubmit={handleSubmit} className="mt-[18px] space-y-2.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">
              <MailIcon />
            </span>
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="Введите email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">
              <LockIcon />
            </span>
            <input
              required
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 hover:text-primary"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>

          {error && <p className="text-[11px] text-coral">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-[18px] h-[34px] w-full rounded-[8px] bg-secondary text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Подождите…" : "Авторизоваться"}
          </button>
        </form>

        <p className="mt-[22px] text-center text-[11px] text-ink/55">Ещё нет аккаунта?</p>
        <a
          href="#contacts"
          onClick={onClose}
          className="mt-1 block text-center text-[12px] font-semibold text-primary hover:underline"
        >
          Получить приглашение
        </a>
      </div>
    </div>
  );
}
