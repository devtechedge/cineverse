'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { Clock, Save } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

interface JournalEditorProps {
  initialContent?: Record<string, unknown> | null;
  currentTime: number;
  draftKey: string;
  onSave: (payload: { content: Record<string, unknown>; content_text: string; timestamp_seconds: number }) => void;
  onSeek?: (t: number) => void;
}

export function JournalEditor({ initialContent, currentTime, draftKey, onSave, onSeek }: JournalEditorProps) {
  const timeRef = useRef(currentTime);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? loadDraft(draftKey) ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[200px] focus:outline-none px-4 py-3',
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON();
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(json));
      } catch { /* quota */ }
    },
    immediatelyRender: false,
  });

  const insertTimestamp = () => {
    if (!editor) return;
    const t = timeRef.current;
    const label = `[${formatTimestamp(t)}]`;
    editor.chain()
      .focus()
      .insertContent({
        type: 'text',
        text: label + ' ',
        marks: [{ type: 'bold' }],
      })
      .run();
    onSeek?.(t);
  };

  const save = () => {
    if (!editor) return;
    const json = editor.getJSON();
    const text = editor.getText();
    onSave({ content: json, content_text: text, timestamp_seconds: timeRef.current });
    try { window.localStorage.removeItem(draftKey); } catch { /* ignore */ }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <button
          onClick={insertTimestamp}
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent px-2 py-1 rounded"
          aria-label="Insert current timestamp"
        >
          <Clock size={14} /> Insert {formatTimestamp(timeRef.current)}
        </button>
        <button
          onClick={save}
          className="ml-auto inline-flex items-center gap-1 text-xs text-white bg-accent hover:bg-accent-hover px-3 py-1 rounded"
        >
          <Save size={14} /> Save
        </button>
      </div>
      <EditorContent editor={editor} className="bg-bg-base/60" />
    </div>
  );
}

function loadDraft(key: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
