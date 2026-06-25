'use client';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFiles: (files: File[]) => void;
  maxBytes?: number;
}

export function UploadDropzone({ onFiles, maxBytes = 10 * 1024 ** 3 }: Props) {
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: onFiles,
    accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.webm', '.m4v'] },
    maxSize: maxBytes,
    multiple: true,
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-300 cursor-pointer',
          'bg-bg-surface/40',
          isDragActive && 'border-accent bg-accent/5',
          isDragAccept && 'border-success',
          isDragReject && 'border-danger',
          !isDragActive && 'border-border-strong hover:border-accent/50',
        ),
      })}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto text-text-secondary mb-3" size={36} />
      <p className="text-text-primary font-medium">
        {isDragActive ? 'Drop the files here' : 'Drag & drop your videos here'}
      </p>
      <p className="text-text-secondary text-sm mt-1">
        or click to browse · MP4 · MOV · MKV · WEBM · up to {(maxBytes / 1024 ** 3).toFixed(0)} GiB
      </p>
    </div>
  );
}
