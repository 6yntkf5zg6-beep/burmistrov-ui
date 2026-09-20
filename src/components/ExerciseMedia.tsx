import { useState } from "react";
import { useModal } from "../hooks/useModal";

/**
 * Кнопки «Фото» и «Видео» у упражнения и просмотр самого файла.
 *
 * Рисуется только то, что есть: у упражнения без медиа кнопок не появляется вовсе.
 * Просмотр лежит выше окон тренировки, поэтому открывается поверх, а закрывается первым.
 */
export function ExerciseMedia({
  imageUrl,
  videoUrl,
  className = "",
}: {
  imageUrl?: string;
  videoUrl?: string;
  className?: string;
}) {
  const [preview, setPreview] = useState<{ type: "image" | "video"; url: string } | null>(null);

  useModal(preview ? () => setPreview(null) : null);

  if (!imageUrl && !videoUrl) return null;

  const buttonClass =
    "shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink/60 transition hover:border-primary hover:text-primary";

  return (
    <>
      <span className={`flex shrink-0 items-center gap-1.5 ${className}`}>
        {imageUrl && (
          <button type="button" onClick={() => setPreview({ type: "image", url: imageUrl })} className={buttonClass}>
            Фото
          </button>
        )}
        {videoUrl && (
          <button type="button" onClick={() => setPreview({ type: "video", url: videoUrl })} className={buttonClass}>
            Видео
          </button>
        )}
      </span>

      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-h-[85vh] max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Закрыть"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-card"
            >
              ✕
            </button>
            {preview.type === "image" ? (
              <img src={preview.url} alt="Упражнение" className="max-h-[85vh] max-w-full rounded-card object-contain" />
            ) : (
              <video src={preview.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-card" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
