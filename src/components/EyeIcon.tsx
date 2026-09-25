/**
 * Глаз для кнопки «показать пароль».
 *
 * Лежит отдельно, потому что нужен в двух местах — в окне входа и на регистрации,
 * — и переключатель должен выглядеть одинаково в обоих.
 *
 * Перечёркнутый глаз показываем, когда пароль уже открыт: значок сообщает, что
 * произойдёт по нажатию, а не то, что происходит сейчас.
 */
export function EyeIcon({
  off,
  size = 16,
  className,
}: {
  off: boolean;
  size?: number;
  /** Размер классами — когда он должен меняться по ширине экрана; перебивает size. */
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 20 16-16" strokeLinecap="round" />}
    </svg>
  );
}
