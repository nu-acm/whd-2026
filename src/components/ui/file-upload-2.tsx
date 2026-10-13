import { useId, useRef, useState } from 'react';
import { CloudUpload, FileText, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Watermelon file-upload-2, adapted to the shared WHD controls and real upload state. */
export function FileUpload({
  onFilesAdded,
  disabled = false,
  uploading = false,
  fileName,
  accept,
  title,
  hint,
  buttonLabel,
  uploadingLabel,
  error,
  className,
}: {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  uploading?: boolean;
  fileName?: string;
  accept?: string;
  title: string;
  hint: string;
  buttonLabel: string;
  uploadingLabel: string;
  error?: string;
  className?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const id = useId();
  const blocked = disabled || uploading;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
      aria-busy={uploading}
      className={cn(
        'file-upload',
        isDragging && !blocked && 'is-dragging',
        blocked && 'is-disabled',
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        if (blocked || !Array.from(event.dataTransfer.types).includes('Files')) return;
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = blocked ? 'none' : 'copy';
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setIsDragging(false);
        if (!blocked && event.dataTransfer.files.length) {
          onFilesAdded(Array.from(event.dataTransfer.files));
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={blocked}
        hidden
        aria-label={buttonLabel}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (!blocked && files.length) onFilesAdded(files);
        }}
      />
      <div className="file-upload-icon" aria-hidden="true">
        {uploading ? <LoaderCircle className="file-upload-spinner" /> : <CloudUpload />}
      </div>
      <h3 id={`${id}-title`} className="file-upload-title">
        {title}
      </h3>
      <p id={`${id}-hint`} className="file-upload-hint">
        {hint}
      </p>
      <Button
        size="sm"
        disabled={blocked}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? uploadingLabel : buttonLabel}
      </Button>
      <div className="file-upload-feedback" role="status" aria-live="polite">
        {uploading && (
          <span className="file-upload-file">
            <FileText size={16} aria-hidden="true" />
            {fileName} — {uploadingLabel}
          </span>
        )}
        {error && (
          <p id={`${id}-error`} className="file-upload-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
