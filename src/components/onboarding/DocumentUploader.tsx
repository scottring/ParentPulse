'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadedFile {
  file: File;
  name: string;
  size: number;
  mimeType: string;
}

interface DocumentUploaderProps {
  onProcess: (files: Array<{ name: string; mimeType: string; base64Data: string }>) => void;
  processing: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = '.pdf,.txt,.png,.jpg,.jpeg,.webp';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per file
const MAX_TOTAL_SIZE = 7 * 1024 * 1024; // 7MB total

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({ onProcess, processing }: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const validateAndAddFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(newFiles);
    const currentCount = files.length;

    if (currentCount + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed. You have ${currentCount} already.`);
      return;
    }

    const validated: UploadedFile[] = [];
    let newTotal = totalSize;

    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported format. Use PDF, TXT, PNG, JPG, or WEBP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is too large (${formatFileSize(file.size)}). Maximum is 3MB per file.`);
        return;
      }
      newTotal += file.size;
      if (newTotal > MAX_TOTAL_SIZE) {
        setError(`Total size would exceed 7MB. Remove some files first.`);
        return;
      }
      validated.push({ file, name: file.name, size: file.size, mimeType: file.type });
    }

    setFiles((prev) => [...prev, ...validated]);
  }, [files.length, totalSize]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [validateAndAddFiles]);

  const handleProcess = async () => {
    if (files.length === 0) return;

    // Read all files to base64
    const base64Files = await Promise.all(
      files.map(
        (f) =>
          new Promise<{ name: string; mimeType: string; base64Data: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Strip the data:...;base64, prefix
              const base64Data = result.split(',')[1];
              resolve({ name: f.name, mimeType: f.mimeType, base64Data });
            };
            reader.onerror = () => reject(new Error(`Failed to read ${f.name}`));
            reader.readAsDataURL(f.file);
          })
      )
    );

    onProcess(base64Files);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="p-8 text-center cursor-pointer transition-all rounded-xl"
        style={{
          border: dragOver ? '2px dashed #7C9082' : '2px dashed rgba(255,255,255,0.5)',
          backgroundColor: dragOver ? 'rgba(124,144,130,0.08)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) validateAndAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="space-y-2">
          <div className="text-3xl" style={{ color: '#8A8078' }}>+</div>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 600, color: '#5C5347' }}>
            Drop files here or click to browse
          </p>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>
            PDF, TXT, PNG, JPG, WEBP &middot; Up to 5 files &middot; 3MB each &middot; 7MB total
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-3 glass-card rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
                  {f.mimeType.includes('pdf') ? 'PDF' : f.mimeType.includes('text') ? 'TXT' : 'IMG'}
                </span>
                <span className="truncate max-w-[200px]" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                  {f.name}
                </span>
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
                  {formatFileSize(f.size)}
                </span>
              </div>
              <button
                onClick={() => removeFile(i)}
                disabled={processing}
                className="text-xs transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="text-right" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} &middot; {formatFileSize(totalSize)} total
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      {/* Privacy notice */}
      <div className="p-3 glass-card rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
        <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
          Your documents are processed securely and never stored. They are read once to extract
          answers, then immediately discarded. Only the extracted answers are saved as a draft
          for your review.
        </p>
      </div>

      {/* Process button */}
      <button
        onClick={handleProcess}
        disabled={files.length === 0 || processing}
        className="w-full px-6 py-4 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}
      >
        {processing ? 'Processing...' : 'Extract answers from documents'}
      </button>
    </div>
  );
}
