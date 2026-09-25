import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";

import type { InviteResponse } from "../../../api/types";

/**
 * Ссылка-приглашение в виде QR-кода: клиент наводит камеру и сразу попадает
 * на регистрацию, не перепечатывая адрес с тридцатью случайными символами.
 *
 * Код рисуется здесь же, на устройстве. Через сторонний генератор картинок токен
 * приглашения ушёл бы на чужой сервер, а он — единственное, что защищает регистрацию.
 */
export function InviteQrDialog({ invite, onClose }: { invite: InviteResponse; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-dvh items-center justify-center bg-black/40 px-3 sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xs rounded-card bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 p-2 text-ink/40 hover:text-ink"
        >
          ✕
        </button>

        <h2 className="pr-6 text-lg font-bold text-ink">
          {invite.label ? `QR: ${invite.label}` : "QR-код приглашения"}
        </h2>
        {/* Белая подложка и поля вокруг кода обязательны: без светлой рамки
            в четыре модуля камера не находит границы кода. */}
        <div className="mt-5 flex justify-center">
          <QRCodeSVG
            value={invite.registrationUrl}
            size={220}
            level="M"
            marginSize={4}
            title="Ссылка для регистрации"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
