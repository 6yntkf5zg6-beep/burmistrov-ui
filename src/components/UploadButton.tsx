import { useRef, useState, type ChangeEvent } from "react";
import { uploadApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/http";
import { Button } from "./Button";

export function UploadButton({
  label,
  accept,
  onUploaded,
  onError,
}: {
  label: string;
  accept: string;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.upload(file);
      onUploaded(url);
    } catch (err) {
      onError(apiErrorMessage(err, "Не удалось загрузить файл"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <Button
        type="button"
        variant="neutral"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex-1 !rounded-full !border !border-line !py-3 !text-xs"
      >
        {uploading ? "Загрузка..." : label}
      </Button>
    </>
  );
}
