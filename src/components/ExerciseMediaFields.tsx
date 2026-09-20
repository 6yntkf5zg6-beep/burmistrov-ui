import { useState } from "react";
import { Button } from "./Button";
import { UploadButton } from "./UploadButton";
import { useModal } from "../hooks/useModal";

export interface ExerciseMedia {
  imageUrl: string;
  videoUrl: string;
}

/**
 * Upload + preview controls for an exercise's picture and video. Shared by every place a
 * trainer can author an exercise — the "Упражнения" catalog, and the "новое упражнение" branch
 * of the workout and program forms — so all of them produce the same single Exercise record.
 */
export function ExerciseMediaFields({
  media,
  onChange,
  onUploadError,
}: {
  media: ExerciseMedia;
  onChange: (media: ExerciseMedia) => void;
  onUploadError: (message: string) => void;
}) {
  const [preview, setPreview] = useState<{ type: "image" | "video"; url: string } | null>(null);

  useModal(preview ? () => setPreview(null) : null);

  return (
    <>
      {(media.imageUrl || media.videoUrl) && (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="neutral"
            disabled={!media.imageUrl}
            onClick={() => setPreview({ type: "image", url: media.imageUrl })}
            className="flex-1 !rounded-full !border !border-line !py-3 !text-xs"
          >
            Просмотреть картинку
          </Button>
          <Button
            type="button"
            variant="neutral"
            disabled={!media.videoUrl}
            onClick={() => setPreview({ type: "video", url: media.videoUrl })}
            className="flex-1 !rounded-full !border !border-line !py-3 !text-xs"
          >
            Просмотреть видео
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <UploadButton
          label="Загрузить картинку"
          accept="image/*"
          onUploaded={(url) => onChange({ ...media, imageUrl: url })}
          onError={onUploadError}
        />
        <UploadButton
          label="Загрузить видео"
          accept="video/*"
          onUploaded={(url) => onChange({ ...media, videoUrl: url })}
          onError={onUploadError}
        />
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
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
              <img src={preview.url} alt="Превью" className="max-h-[85vh] max-w-full rounded-card object-contain" />
            ) : (
              <video src={preview.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-card" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
