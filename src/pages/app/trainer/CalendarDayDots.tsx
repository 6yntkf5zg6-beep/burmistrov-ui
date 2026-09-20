/**
 * Точки под числом в компактном календаре: по одной на тренировку.
 * На узком экране в клетку не помещаются ни имена, ни названия, а знать,
 * занят ли день и чем он кончился, всё равно нужно.
 */
export function CalendarDayDots({ dots, more = 0 }: { dots: string[]; more?: number }) {
  if (!dots.length && !more) return <span className="mt-[3px] block h-[5px]" />;

  return (
    <span className="mt-[3px] flex items-center justify-center gap-[2px]">
      {dots.map((className, i) => (
        <i key={i} className={`block h-[5px] w-[5px] rounded-full ${className}`} />
      ))}
      {more > 0 && <span className="text-[8px] font-bold leading-none text-ink/45">+{more}</span>}
    </span>
  );
}

/** Сколько точек влезает в клетку, не превращаясь в кашу. */
export const MAX_DOTS = 3;
