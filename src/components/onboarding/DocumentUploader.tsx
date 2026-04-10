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
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_TOTAL_SIZE = 7 * 1024 * 1024;

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

  const validateAndAddFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);
      const currentCount = files.length;

      if (currentCount + fileArray.length > MAX_FILES) {
        setError(`At most ${MAX_FILES} documents may be added — you already have ${currentCount}.`);
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
          setError(
            `"${file.name}" is too large (${formatFileSize(file.size)}). Maximum is 3 MB per document.`,
          );
          return;
        }
        newTotal += file.size;
        if (newTotal > MAX_TOTAL_SIZE) {
          setError('Total size would exceed 7 MB. Remove some first.');
          return;
        }
        validated.push({ file, name: file.name, size: file.size, mimeType: file.type });
      }

      setFiles((prev) => [...prev, ...validated]);
    },
    [files.length, totalSize],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles],
  );

  const handleProcess = async () => {
    if (files.length === 0) return;

    const base64Files = await Promise.all(
      files.map(
        (f) =>
          new Promise<{ name: string; mimeType: string; base64Data: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve({ name: f.name, mimeType: f.mimeType, base64Data });
            };
            reader.onerror = () => reject(new Error(`Failed to read ${f.name}`));
            reader.readAsDataURL(f.file);
          }),
      ),
    );

    onProcess(base64Files);
  };

  return (
    <div>
      {/* Drop zone — quiet, typographic, no chunky rounded card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="transition-all cursor-pointer"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          border: `1px dashed ${dragOver ? '#7C9082' : 'rgba(200, 190, 172, 0.7)'}`,
          background: dragOver ? 'rgba(124,144,130,0.04)' : 'transparent',
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
        <span className="press-chapter-label" style={{ display: 'block' }}>
          Drop here or click to browse
        </span>
        <p
          className="press-body-italic"
          style={{ fontSize: 16, marginTop: 10, marginBottom: 8 }}
        >
          Bring therapy notes, journal entries, or letters.
        </p>
        <p className="press-marginalia" style={{ fontSize: 14 }}>
          PDF, TXT, PNG, JPG, or WEBP &middot; up to five files &middot;
          three MB each &middot; seven MB total
        </p>
      </div>

      {/* File list — classical index style */}
      {files.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <span className="press-chapter-label">Kept for reading</span>
          <div style={{ marginTop: 12 }}>
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between"
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(200, 190, 172, 0.4)',
                }}
              >
                <div className="flex items-baseline gap-3 min-w-0 flex-1">
                  <span
                    className="press-chapter-label"
                    style={{ width: 24, flexShrink: 0, color: '#7A6E5C' }}
                  >
                    {f.mimeType.includes('pdf') ? 'pdf' : f.mimeType.includes('text') ? 'txt' : 'img'}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontStyle: 'italic',
                      fontSize: 15,
                      color: '#3A3530',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {f.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-4 shrink-0">
                  <span className="press-marginalia" style={{ fontSize: 14 }}>
                    {formatFileSize(f.size)}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    disabled={processing}
                    className="press-link-sm"
                    style={{
                      background: 'transparent',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                    }}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p
            className="press-marginalia"
            style={{ fontSize: 14, textAlign: 'right', marginTop: 8, color: '#7A6E5C' }}
          >
            {files.length} document{files.length !== 1 ? 's' : ''} &middot;{' '}
            {formatFileSize(totalSize)} total
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginTop: 20,
            borderLeft: '2px solid rgba(192,128,112,0.5)',
            background: 'rgba(192,128,112,0.05)',
          }}
        >
          <p
            className="press-marginalia"
            style={{ fontSize: 14, color: '#C08070' }}
          >
            — {error}
          </p>
        </div>
      )}

      {/* Privacy notice */}
      <p
        className="press-marginalia"
        style={{
          fontSize: 13,
          marginTop: 24,
          textAlign: 'center',
          maxWidth: 460,
          marginLeft: 'auto',
          marginRight: 'auto',
          color: '#7A6E5C',
          lineHeight: 1.6,
        }}
      >
        Your documents are read once to extract answers and then
        immediately discarded. Only the extracted answers are kept,
        and only as a draft for your review.
      </p>

      {/* Process action — italic link, not a filled button */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button
          onClick={handleProcess}
          disabled={files.length === 0 || processing}
          className="press-link"
          style={{
            background: 'transparent',
            cursor:
              files.length === 0 || processing ? 'not-allowed' : 'pointer',
            opacity: files.length === 0 || processing ? 0.4 : 1,
            fontSize: 18,
          }}
        >
          {processing ? 'Reading the documents…' : 'Extract answers'}
          {!processing && <span className="arrow">⟶</span>}
        </button>
      </div>
    </div>
  );
}
