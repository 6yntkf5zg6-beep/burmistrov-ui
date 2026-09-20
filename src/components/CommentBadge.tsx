/**
 * Жёлтый кружок с восклицательным знаком: на этой тренировке клиент что-то написал.
 *
 * Метка маленькая и одинаковая везде — в календаре, в истории и рядом с самим
 * комментарием, — чтобы взгляд узнавал её без чтения.
 */
export function CommentBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;

  const label = count === 1 ? "Клиент оставил комментарий" : `Комментариев от клиента: ${count}`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber text-[10px] font-black leading-none text-ink ${className}`}
    >
      !
    </span>
  );
}
