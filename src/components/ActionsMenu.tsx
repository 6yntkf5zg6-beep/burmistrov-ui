import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useEscapeClose } from "../hooks/useEscapeClose";

export interface MenuAction {
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function ActionsMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEscapeClose(open ? () => setOpen(false) : null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Действия"
        aria-expanded={open}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/35 hover:bg-offwhite hover:text-ink/60"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13.5" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-2xl bg-white py-1.5 shadow-card">
          {actions.map((action) => {
            const className = `block w-full px-4 py-2 text-left text-sm ${
              action.danger ? "text-coral hover:bg-coral/10" : "text-ink hover:bg-offwhite"
            }`;
            if (action.to) {
              return (
                <Link key={action.label} to={action.to} onClick={() => setOpen(false)} className={className}>
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  action.onClick?.();
                }}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
