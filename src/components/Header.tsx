import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/home/logo.png";
import { useAuth } from "../auth/AuthContext";
import { LoginModal } from "./LoginModal";
import { UserChip } from "./UserChip";
import { HERO_FRAME_WIDTH } from "../pages/home/heroData";

/**
 * Шапка публичных страниц: логотип и единственная кнопка «Личный кабинет».
 * Навигация по разделам живёт в коллаже вертикальным списком, дублировать её
 * сверху незачем. Ширина и отступы взяты от холста коллажа — одни и те же на
 * всех публичных страницах, чтобы шапка не прыгала при переходе.
 */
export function Header() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="relative z-20">
      <div className="mx-auto" style={{ width: HERO_FRAME_WIDTH }}>
        <div className="flex items-start justify-between gap-6 px-6 pt-5 lg:pl-[4%] lg:pr-[6.39%] lg:pt-[1.4%]">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="СТАН" className="w-[150px] lg:w-[210px]" />
          </Link>

          <div className="flex items-center gap-3 pt-[16px] lg:pt-[10px]">
            {user ? (
              <UserChip to="/dashboard" />
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="h-10 shrink-0 whitespace-nowrap rounded-[15px] bg-secondary px-4 text-[13px] font-bold text-white transition hover:brightness-110 lg:w-[213px] lg:px-0 lg:text-sm"
              >
                Личный кабинет
              </button>
            )}
          </div>
        </div>
      </div>

      {authOpen && <LoginModal onClose={() => setAuthOpen(false)} />}
    </header>
  );
}
