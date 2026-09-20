import { Outlet, Link } from "react-router-dom";
import logo from "../../assets/home/logo.png";
import { useAuth } from "../../auth/AuthContext";
import { UserChip } from "../../components/UserChip";

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="bg-gradient-to-r from-primary-dark to-secondary px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="СТАН" className="h-14 w-auto" />
          </Link>

          <p className="hidden text-sm text-white/80 md:block">
            +7 (3452) 666-44-44 · ССК «Олимп», ул. Оптиков, д.4, лит.А, БЦ «Лахта»
          </p>

          {user && <UserChip />}
        </div>
      </header>

      {/* На телефоне поля уже: лишние 16 пикселей ширины видны в каждой строке списка. */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
