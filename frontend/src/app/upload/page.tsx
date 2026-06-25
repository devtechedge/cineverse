'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { UploadDropzone } from '@/components/UploadDropzone';
import { UploadQueue } from '@/components/UploadQueue';
import { useUploadStore } from '@/stores/upload';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';

export default function UploadPage() {
  const user = useAuthStore((s) => s.user);
  const enqueue = useUploadStore((s) => s.enqueue);
  const start = useUploadStore((s) => s.startUpload);
  const [pending, setPending] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-12 text-center">
        <p className="text-text-secondary mb-4">Please sign in to upload.</p>
        <Link href="/login" className="text-accent hover:underline">Sign in →</Link>
      </div>
    );
  }

  const onDrop = (files: File[]) => {
    setPending((prev) => [...prev, ...files]);
    if (files[0] && !title) setTitle(files[0].name.replace(/\.[^.]+$/, ''));
  };

  const submit = () => {
    if (pending.length === 0) {
      toast.error('Choose a video first');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tagList = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    for (const f of pending) {
      const id = enqueue(f, { title: title.trim(), description: description.trim() || undefined, tags: tagList });
      start(id).then(() => toast.success(`Uploaded ${f.name}`)).catch(() => toast.error(`Failed ${f.name}`));
    }

    setPending([]);
    setTitle('');
    setDescription('');
    setTags('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header>
        <h1 className="font-display text-5xl tracking-wider">UPLOAD</h1>
        <p className="text-text-secondary mt-2">
          Add a video to your archive. Files are uploaded in 1 MiB chunks and processed asynchronously.
        </p>
      </header>

      <UploadDropzone onFiles={onDrop} />

      {pending.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-md p-4 space-y-3">
          <p className="text-sm text-text-secondary">
            {pending.length} file{pending.length > 1 ? 's' : ''} ready · total{' '}
            {(pending.reduce((s, f) => s + f.size, 0) / 1024 ** 2).toFixed(1)} MiB
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma, separated"
            className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPending([])}
              className="px-3 py-1.5 text-sm rounded-md border border-border-strong hover:border-danger text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-4 py-1.5 text-sm rounded-md bg-accent hover:bg-accent-hover text-white"
            >
              Start upload
            </button>
          </div>
        </div>
      )}

      <UploadQueue />
    </div>
  );
}
