import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "../assets/home/logo.png";
import { inviteApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { InviteCheckResponse } from "../api/types";
import { Button } from "../components/Button";

export function RegisterPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState<InviteCheckResponse | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    inviteApi
      .check(token)
      .then((res) => setInvite(res.valid ? res : null))
      .catch(() => setInvite(null))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, phone: phone || undefined, inviteToken: token });
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось завершить регистрацию"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary to-secondary px-4 py-12">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-card">
        <img src={logo} alt="СТАН" className="mx-auto h-16 w-auto" />

        {checking ? (
          <p className="mt-6 text-center text-sm text-ink/60">Проверяем ссылку...</p>
        ) : !invite ? (
          <div className="mt-6 text-center">
            <h1 className="text-xl font-bold text-ink">Ссылка недействительна</h1>
            <p className="mt-2 text-sm text-ink/60">
              Эта ссылка-приглашение уже использована, устарела или не существует. Запросите новую у тренера.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-center text-xl font-bold text-ink">
              {invite.firstName} {invite.lastName}
            </h1>
            <p className="mt-1 text-center text-sm text-ink/60">
              Вас пригласил тренер <span className="font-semibold text-primary">{invite.trainerName}</span>. Осталось
              указать контакты и придумать пароль.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                placeholder="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="email"
                placeholder="Введите email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="password"
                minLength={8}
                placeholder="Придумайте пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary"
              />

              {error && <p className="text-sm text-coral">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full !normal-case !text-base">
                {submitting ? "Подождите..." : "Зарегистрироваться"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
