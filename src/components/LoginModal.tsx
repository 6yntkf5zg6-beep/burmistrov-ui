import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../api/http";
import { useModal } from "../hooks/useModal";
import { EyeIcon } from "./EyeIcon";

function MailIcon() {
  return (
    <svg width="18" height="18" className="size-[18px] max-sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" className="size-[18px] max-sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10" strokeLinecap="round" />
    </svg>
  );
}

// Размеры окна входа заданы числами, а не шкалой Tailwind: оно нарисовано по макету.
// Здесь и ниже всё увеличено примерно на пятую часть — в прежнем масштабе поля
// поджимали текст, а кружки скрытого пароля выглядели крупнее самой строки.
const FIELD =
  "h-[40px] w-full rounded-[10px] bg-offwhite pl-[40px] pr-11 text-[14px] text-ink outline-none placeholder:text-ink/40 focus:ring-1 focus:ring-primary/40 " +
  // На телефоне палец, а не курсор: поле выше, отступы под значки больше.
  // Размер шрифта не трогаем — ниже 640px он и так принудительно 16px.
  "max-sm:h-[50px] max-sm:rounded-full max-sm:pl-[46px] max-sm:pr-[50px]";

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
        className="relative w-full max-w-[350px] rounded-[18px] bg-white px-[30px] py-[26px] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.35)] max-sm:max-w-none max-sm:rounded-card max-sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3.5 top-3.5 text-ink/35 hover:text-ink max-sm:right-4 max-sm:top-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 max-sm:size-[18px]">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="text-center text-[18px] font-bold text-ink max-sm:text-[21px]">Добро пожаловать!</h2>
        <p className="mx-auto mt-1.5 max-w-[250px] text-center text-[13px] leading-[1.35] text-ink/55 max-sm:max-w-[280px] max-sm:text-[14px]">
          Пожалуйста введите ваши данные для входа в систему
        </p>

        <form onSubmit={handleSubmit} className="mt-[22px] space-y-3 max-sm:mt-[26px] max-sm:space-y-3.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 max-sm:left-4">
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
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 max-sm:left-4">
              <LockIcon />
            </span>
            {/* password-field — те же кружки-заглушки, что на регистрации: без него
                они здесь набраны 13-м кеглем и сливаются, а на телефоне, где поля
                принудительно 16-е, наоборот выглядят частоколом. Класс добавлен только
                к полю пароля: FIELD общий с полем email, там он ни к чему. */}
            <input
              required
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${FIELD} password-field password-field--compact`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/70 hover:text-primary max-sm:right-4"
            >
              <EyeIcon off={showPassword} size={18} className="size-[18px] max-sm:size-5" />
            </button>
          </div>

          {error && <p className="text-[12px] text-coral max-sm:text-[13px]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-[22px] h-[40px] w-full rounded-[10px] bg-secondary text-[14px] font-bold text-white transition hover:brightness-110 disabled:opacity-60 max-sm:mt-[26px] max-sm:h-[50px] max-sm:rounded-full max-sm:text-[16px]"
          >
            {submitting ? "Подождите…" : "Авторизоваться"}
          </button>
        </form>

        <p className="mt-[26px] text-center text-[12px] text-ink/55 max-sm:mt-[28px] max-sm:text-[13px]">Ещё нет аккаунта?</p>
        <a
          href="#contacts"
          onClick={onClose}
          className="mt-1.5 block text-center text-[13px] font-semibold text-primary hover:underline max-sm:text-[14px]"
        >
          Получить приглашение
        </a>
      </div>
    </div>
  );
}
