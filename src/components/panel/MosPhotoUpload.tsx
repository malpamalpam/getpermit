"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check } from "lucide-react";

const MOS_WIDTH = 684;
const MOS_HEIGHT = 883;

interface Props {
  onPhotoReady?: (blob: Blob) => void;
}

/**
 * Component for capturing or uploading a photo for the MOS system.
 * Automatically validates and crops to 684×883 px.
 */
export function MosPhotoUpload({ onPhotoReady }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Dozwolone formaty: JPG, PNG");
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Crop to center with MOS aspect ratio
        const targetRatio = MOS_WIDTH / MOS_HEIGHT;
        const imgRatio = img.width / img.height;

        let sx = 0,
          sy = 0,
          sw = img.width,
          sh = img.height;

        if (imgRatio > targetRatio) {
          // Image is wider — crop sides
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          // Image is taller — crop top/bottom
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = MOS_WIDTH;
        canvas.height = MOS_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, MOS_WIDTH, MOS_HEIGHT);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setPreview(dataUrl);

        canvas.toBlob(
          (blob) => {
            if (blob && onPhotoReady) {
              onPhotoReady(blob);
            }
          },
          "image/jpeg",
          0.92
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Nie udało się przetworzyć zdjęcia.");
      };

      img.src = url;
    },
    [onPhotoReady]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/10 bg-white p-5">
      <h3 className="font-display text-base font-bold text-primary">
        Zdjęcie do systemu MOS
      </h3>
      <p className="text-xs text-primary/60">
        Wymagany format: {MOS_WIDTH} &times; {MOS_HEIGHT} px. Zdjęcie zostanie
        automatycznie przycięte do wymaganego formatu.
      </p>

      <canvas ref={canvasRef} className="hidden" />

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Podgląd zdjęcia MOS"
            className="h-44 w-auto rounded-lg border border-primary/10 shadow-sm"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            {MOS_WIDTH} &times; {MOS_HEIGHT} px — gotowe
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {/* Camera capture */}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/15 bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent/5">
            <Camera className="h-4 w-4" />
            Zrób zdjęcie
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* File upload */}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/15 bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent/5">
            <Upload className="h-4 w-4" />
            Wybierz plik
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
