/** Кнопки порядка и правки для карточек, которыми тренер управляет прямо на странице. */
export function OrderControls({
  onUp,
  onDown,
  onEdit,
  onDelete,
  disabled,
  tone = "light",
  axis = "vertical",
}: {
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  /** Стрелки смотрят туда же, куда идёт список: вниз в колонке, вбок в ленте. */
  axis?: "vertical" | "horizontal";
}) {
  const base =
    tone === "light"
      ? "border-line bg-white text-ink/70 hover:border-primary hover:text-primary"
      : "border-white/25 bg-white/10 text-white/80 hover:border-white hover:text-white";

  const button = `grid h-8 w-8 place-items-center rounded-[8px] border text-sm transition disabled:opacity-40 ${base}`;

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onUp} disabled={disabled} aria-label="Выше" className={button}>
        {axis === "horizontal" ? "←" : "↑"}
      </button>
      <button type="button" onClick={onDown} disabled={disabled} aria-label="Ниже" className={button}>
        {axis === "horizontal" ? "→" : "↓"}
      </button>
      <button type="button" onClick={onEdit} disabled={disabled} aria-label="Редактировать" className={button}>
        ✎
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label="Удалить"
        className={`${button} hover:!border-coral hover:!text-coral`}
      >
        ✕
      </button>
    </div>
  );
}
