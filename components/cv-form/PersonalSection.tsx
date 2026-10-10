"use client";

import { useRef, useState } from "react";
import { isValidEmail, isValidUrl } from "@/lib/cv-validation";
import { useI18n } from "@/lib/i18n";
import { TextField } from "../ui/Field";
import { btn } from "../ui/styles";
import type { SectionProps } from "./types";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_SIZE = 360;

/** Downscale and centre-crop the photo to a small square JPEG data URL (kept on-device). */
async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(PHOTO_SIZE, side);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PersonalSection({ cv, dispatch }: SectionProps) {
  const { t } = useI18n();
  const f = t.form.personal;
  const p = cv.personal;
  const set = (patch: Partial<typeof p>) => dispatch({ type: "setPersonal", patch });
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onPhoto = async (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_PHOTO_BYTES) {
      setPhotoError(f.photoError);
      return;
    }
    try {
      set({ photo: await resizePhoto(file) });
    } catch {
      setPhotoError(f.photoError);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const emailError = p.email.trim() && !isValidEmail(p.email) ? t.form.errors.email : null;
  const urlError = (v: string) => (v.trim() && !isValidUrl(v) ? t.form.errors.url : null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        className="sm:col-span-2"
        label={`${f.fullName} (${t.form.required})`}
        value={p.fullName}
        onChange={(v) => set({ fullName: v })}
        autoComplete="name"
      />
      <TextField
        className="sm:col-span-2"
        label={f.jobTitle}
        value={p.title}
        placeholder={f.jobTitlePlaceholder}
        onChange={(v) => set({ title: v })}
        autoComplete="organization-title"
      />
      <TextField
        label={f.email}
        type="email"
        inputMode="email"
        value={p.email}
        onChange={(v) => set({ email: v })}
        autoComplete="email"
        error={emailError}
      />
      <TextField
        label={f.phone}
        type="tel"
        inputMode="tel"
        value={p.phone}
        onChange={(v) => set({ phone: v })}
        autoComplete="tel"
      />
      <TextField label={f.city} value={p.city} onChange={(v) => set({ city: v })} autoComplete="address-level2" />
      <TextField
        label={f.country}
        value={p.country}
        onChange={(v) => set({ country: v })}
        autoComplete="country-name"
      />
      <TextField
        label={f.linkedin}
        type="url"
        inputMode="url"
        value={p.linkedin}
        placeholder="linkedin.com/in/…"
        onChange={(v) => set({ linkedin: v })}
        error={urlError(p.linkedin)}
      />
      <TextField
        label={f.website}
        type="url"
        inputMode="url"
        value={p.website}
        onChange={(v) => set({ website: v })}
        autoComplete="url"
        error={urlError(p.website)}
      />
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium text-stone-800">
          {f.photo} <span className="font-normal text-stone-500">({t.form.optional})</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {p.photo && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={p.photo} alt={f.photoAlt} className="size-16 rounded-md border border-stone-200 object-cover" />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            id="photo-input"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          <label htmlFor="photo-input" className={`${btn.secondary} cursor-pointer`}>
            {p.photo ? f.photoChange : f.photoUpload}
          </label>
          {p.photo && (
            <button type="button" className={btn.ghost} onClick={() => set({ photo: "" })}>
              {f.photoRemove}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-stone-600">{f.photoHint}</p>
        {photoError && (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {photoError}
          </p>
        )}
      </div>
    </div>
  );
}
