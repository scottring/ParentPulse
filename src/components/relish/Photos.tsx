"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { PHOTO_LIMIT, type Photo, type PhotoAccess } from "@/lib/relish/photos";

export function PhotoImage({
  photo,
  access,
}: {
  photo: Photo;
  access: PhotoAccess;
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const load = useRef(access.load);
  useEffect(() => {
    load.current = access.load;
  }, [access.load]);
  useEffect(() => {
    let alive = true,
      url = "";
    load
      .current(photo.id)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (alive)
          setError(
            "This photo couldn’t be opened. Restore a backup with its photos.",
          );
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);
  if (error)
    return (
      <p role="status" className="lb-fine">
        {error}
      </p>
    );
  // Decrypted object URLs stay in memory and are revoked as soon as this view closes.
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={photo.width}
      height={photo.height}
      alt={photo.caption || "A photo kept on this page"}
    />
  ) : (
    <span className="rj-photo-loading">Opening photo…</span>
  );
}
export function PhotoGallery({
  photos,
  access,
}: {
  photos: Photo[];
  access?: PhotoAccess;
}) {
  if (!photos.length || !access) return null;
  return (
    <div className="rj-photos">
      {photos.map((photo) => (
        <figure key={photo.id}>
          <PhotoImage photo={photo} access={access} />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
export function PhotoPicker({
  photos,
  access,
  onChange,
  disabled,
  onBusy,
}: {
  photos: Photo[];
  access: PhotoAccess;
  onChange: (photos: Photo[]) => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const upload = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    working = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function add(file?: File) {
    if (!file || working.current || photos.length >= PHOTO_LIMIT) return;
    working.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const photo = await access.add(file);
      if (alive.current) onChange([...photos, photo]);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "That photo couldn’t be added. Try another.",
        );
    } finally {
      working.current = false;
      if (alive.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  const unavailable = disabled || busy || photos.length >= PHOTO_LIMIT;
  return (
    <section className="rj-photo-picker" aria-label="Photos on this page">
      <div className="rj-capture-actions">
        <button
          type="button"
          className="lb-secondary"
          disabled={unavailable}
          onClick={() => upload.current?.click()}
        >
          <ImagePlus size={20} /> Add a photo
        </button>
        <button
          type="button"
          className="lb-secondary"
          disabled={unavailable}
          onClick={() => camera.current?.click()}
        >
          <Camera size={20} /> Take a photo
        </button>
        <span className="lb-fine">
          {busy
            ? "Tucking your photo into the book…"
            : `${photos.length} / ${PHOTO_LIMIT} photos · kept on this device`}
        </span>
      </div>
      <input
        ref={upload}
        className="rj-sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        aria-label="Upload a photo"
        tabIndex={-1}
        onChange={(e) => {
          void add(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        className="rj-sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a photo with the camera"
        tabIndex={-1}
        onChange={(e) => {
          void add(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="lb-error" role="alert">
          {error}
        </p>
      )}
      <div className="rj-photos">
        {photos.map((photo) => (
          <figure key={photo.id}>
            <PhotoImage photo={photo} access={access} />
            <label>
              Photo caption
              <input
                maxLength={240}
                value={photo.caption}
                disabled={disabled || busy}
                placeholder="A few words about this moment…"
                onChange={(e) =>
                  onChange(
                    photos.map((p) =>
                      p.id === photo.id ? { ...p, caption: e.target.value } : p,
                    ),
                  )
                }
              />
            </label>
            <button
              className="lb-text"
              type="button"
              disabled={disabled || busy}
              onClick={() => onChange(photos.filter((p) => p.id !== photo.id))}
            >
              <X size={16} /> Remove from page
            </button>
          </figure>
        ))}
      </div>
    </section>
  );
}
