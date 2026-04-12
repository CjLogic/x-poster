import { useState, useCallback } from 'react';
import { AddTweetInput } from '../types';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { HashtagSelector } from './HashtagSelector';
import { DateTimePicker } from './DateTimePicker';

interface AddTweetFormProps {
  onSubmit: (data: AddTweetInput) => Promise<void>;
}

export function AddTweetForm({ onSubmit }: AddTweetFormProps) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'tweet',
        text: text.trim(),
        media: media.length > 0 ? media : undefined,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      });
      setText('');
      setMedia([]);
      setScheduledAt(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const mediaFiles = files
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(f => f.name);
    if (mediaFiles.length > 0) {
      setMedia(prev => [...prev, ...mediaFiles]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const isOverLimit = text.length > 280;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
        <div className="flex justify-between items-center">
          <HashtagSelector text={text} onChange={setText} />
          <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
            {text.length} / 280
          </span>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging
            ? 'border-zinc-500 bg-zinc-800/50'
            : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-6 w-6 text-zinc-500" />
          <p className="text-sm text-zinc-400">
            Drag & drop images or videos here
          </p>
          <p className="text-xs text-zinc-500">
            or paste a file path below
          </p>
        </div>
        <input
          type="text"
          placeholder="/path/to/image.jpg"
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const input = e.target as HTMLInputElement;
              if (input.value.trim()) {
                setMedia(prev => [...prev, input.value.trim()]);
                input.value = '';
              }
            }
          }}
        />
      </div>

      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((m, i) => (
            <div key={i} className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              <ImageIcon className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{m.split('/').pop()}</span>
              <button type="button" onClick={() => removeMedia(i)} className="ml-1 text-zinc-500 hover:text-zinc-300">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <DateTimePicker value={scheduledAt} onChange={setScheduledAt} label="Schedule" />
        
        <button
          type="submit"
          disabled={!text.trim() || isOverLimit || isSubmitting}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : scheduledAt ? 'Schedule' : 'Add to Queue'}
        </button>
      </div>
    </form>
  );
}
