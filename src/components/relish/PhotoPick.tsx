"use client";
import { useRef, type ReactNode } from "react";

/**
 * A button that opens the device's photo picker straight away (it must be
 * opened from the tap itself), then hands back the chosen file.
 */
export default function PhotoPick({
  onFile,
  disabled,
  className,
  label,
  children,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}
