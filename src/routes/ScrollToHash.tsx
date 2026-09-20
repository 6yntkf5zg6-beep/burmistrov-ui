import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router меняет адрес, но к якорю не прокручивает. Делаем это сами:
 * при появлении хеша — к секции, без хеша после смены страницы — наверх.
 */
export function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pathname, hash]);

  return null;
}
