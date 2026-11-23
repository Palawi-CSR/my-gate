import { Camera, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: Blob | null;
  onChange: (photo: Blob | null) => void;
}

const MAX_SIDE = 1280; // px; keeps uploads well under the API's 5 MB limit

/**
 * Re-encode an image as a JPEG no larger than MAX_SIDE on its longest side.
 * Phone photos are often 5–12 MB (and sometimes HEIC); this makes them small and in a
 * format the API accepts, and applies the EXIF rotation so portraits stay upright.
 */
async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  );
}

/** Live camera preview needs getUserMedia, which browsers only allow on HTTPS or localhost. */
const canUseLiveCamera = () => window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

/** Take a photo with the device camera, or upload an image file. */
export default function PhotoPicker({ value, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  async function openCamera() {
    setError('');
    // On phones opened over plain http (e.g. http://192.168.x.x), fall back to the
    // phone's own camera app through a file input.
    if (!canUseLiveCamera()) return cameraFileRef.current?.click();
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }));
    } catch {
      cameraFileRef.current?.click();
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onChange(blob);
        setStream(null);
      },
      'image/jpeg',
      0.85,
    );
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange(await shrinkImage(file));
    } catch {
      setError('Could not read that image. Please use a JPEG or PNG photo.');
    } finally {
      setBusy(false);
    }
  }

  const btn =
    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-teal hover:text-teal active:bg-slate-50 sm:py-2';

  return (
    <div className="space-y-2">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-teal" />
        ) : preview ? (
          <>
            <img src={preview} alt="Selected" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Remove photo"
              aria-label="Remove photo"
              className="absolute top-2 right-2 rounded-full bg-black/55 p-2 text-white backdrop-blur transition hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={openCamera} className="flex flex-col items-center gap-2 text-slate-400 transition hover:text-teal">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <ImagePlus className="h-6 w-6" />
            </span>
            <span className="text-sm">Tap to take a photo</span>
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {stream ? (
          <>
            <button
              type="button"
              onClick={capture}
              className="bg-brand flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold text-white transition hover:brightness-110 sm:py-2"
            >
              <Camera className="h-4 w-4" /> Capture
            </button>
            <button type="button" onClick={() => setStream(null)} className={btn}>
              <X className="h-4 w-4" /> Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={openCamera} className={btn}>
              <Camera className="h-4 w-4" /> {value ? 'Retake' : 'Camera'}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
              <Upload className="h-4 w-4" /> Upload
            </button>
          </>
        )}
        {/* Gallery / files */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {/* Opens the phone's camera app directly */}
        <input
          ref={cameraFileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
