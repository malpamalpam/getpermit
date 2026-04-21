"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, Check, CircleDot, Loader2 } from "lucide-react";

const MOS_WIDTH = 684;
const MOS_HEIGHT = 883;

interface Props {
  initialPhoto?: string | null;
  onPhotoReady?: (dataUrl: string) => void;
}

/**
 * Component for capturing or uploading a biometric photo.
 * Automatically crops to 684×883 px with white background.
 */
export function MosPhotoUpload({ initialPhoto, onPhotoReady }: Props) {
  const [preview, setPreview] = useState<string | null>(initialPhoto ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Attach stream to <video> once rendered
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch((err) => console.error("Video play() failed:", err));
    }
  }, [cameraActive]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const cropAndFinalize = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement, sourceWidth: number, sourceHeight: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const targetRatio = MOS_WIDTH / MOS_HEIGHT;
      const imgRatio = sourceWidth / sourceHeight;

      let sx = 0,
        sy = 0,
        sw = sourceWidth,
        sh = sourceHeight;

      if (imgRatio > targetRatio) {
        sw = sourceHeight * targetRatio;
        sx = (sourceWidth - sw) / 2;
      } else {
        sh = sourceWidth / targetRatio;
        sy = (sourceHeight - sh) / 2;
      }

      canvas.width = MOS_WIDTH;
      canvas.height = MOS_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw original cropped image first
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, MOS_WIDTH, MOS_HEIGHT);

      // Try to remove background and replace with white
      setProcessing(true);
      try {
        const croppedBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );

        // Dynamic import from CDN to avoid webpack bundling issues
        const { removeBackground } = await import(
          /* webpackIgnore: true */
          "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/dist/index.mjs"
        );

        const noBgBlob: Blob = await removeBackground(croppedBlob, {
          output: { format: "image/png" },
        });

        const noBgImg = new Image();
        const noBgUrl = URL.createObjectURL(noBgBlob);

        await new Promise<void>((resolve, reject) => {
          noBgImg.onload = () => resolve();
          noBgImg.onerror = () => reject(new Error("Failed to load processed image"));
          noBgImg.src = noBgUrl;
        });

        // White background + transparent foreground
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, MOS_WIDTH, MOS_HEIGHT);
        ctx.drawImage(noBgImg, 0, 0, MOS_WIDTH, MOS_HEIGHT);
        URL.revokeObjectURL(noBgUrl);
        console.log("[MosPhoto] Background removed successfully");
      } catch (err) {
        console.warn("[MosPhoto] Background removal failed, using original:", err);
        // Keep the original cropped image as-is
      } finally {
        setProcessing(false);
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setPreview(dataUrl);
      onPhotoReady?.(dataUrl);
    },
    [onPhotoReady]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    console.log("[MosPhoto] Starting camera...");

    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("Kamera wymaga połączenia HTTPS.");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log("[MosPhoto] Video devices:", devices.filter((d) => d.kind === "videoinput"));

    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1024 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      console.log("[MosPhoto] Stream obtained:", stream.getVideoTracks().map((t) => t.label));
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      const name = err instanceof DOMException ? err.name : "";
      switch (name) {
        case "NotAllowedError":
          setError("Dostęp do kamery został zablokowany. Kliknij ikonkę kłódki w pasku adresu i zezwól na dostęp do kamery.");
          break;
        case "NotFoundError":
          setError("Nie wykryto kamery w tym urządzeniu.");
          break;
        case "NotReadableError":
          setError("Kamera jest używana przez inną aplikację.");
          break;
        default:
          setError("Nie udało się uruchomić kamery. Sprawdź uprawnienia w przeglądarce.");
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setProcessing(true);
    cropAndFinalize(video, video.videoWidth, video.videoHeight);
    setProcessing(false);
    stopCamera();
  }, [cropAndFinalize, stopCamera]);

  const processImage = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Dozwolone formaty: JPG, PNG");
        return;
      }

      setProcessing(true);
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        cropAndFinalize(img, img.width, img.height);
        setProcessing(false);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Nie udało się przetworzyć zdjęcia.");
        setProcessing(false);
      };

      img.src = url;
    },
    [cropAndFinalize]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    onPhotoReady?.("");
  };

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" />

      {processing ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium text-primary/70">Przetwarzanie zdjęcia...</p>
        </div>
      ) : cameraActive ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-primary/10 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-64 w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <CircleDot className="h-5 w-5 text-red-500" />
                Zrób zdjęcie
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/30"
              >
                <X className="h-4 w-4" />
                Anuluj
              </button>
            </div>
          </div>
        </div>
      ) : preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Zdjęcie biometryczne"
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
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/15 bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent/5"
          >
            <Camera className="h-4 w-4" />
            Zrób zdjęcie
          </button>

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
