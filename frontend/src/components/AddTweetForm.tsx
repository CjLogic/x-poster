import { useState } from 'react';
import { AddTweetInput } from '../types';
import { Image as ImageIcon } from 'lucide-react';

interface AddTweetFormProps {
  onSubmit: (data: AddTweetInput) => Promise<void>;
}

export function AddTweetForm({ onSubmit }: AddTweetFormProps) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'tweet',
        text: text.trim(),
        media: media.trim() ? [media.trim()] : undefined,
      });
      setText('');
      setMedia('');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="flex justify-end">
          <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
            {text.length} / 280
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <ImageIcon className="h-4 w-4" /> Media Path (optional)
        </label>
        <input
          type="text"
          value={media}
          onChange={(e) => setMedia(e.target.value)}
          placeholder="/path/to/image.jpg"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!text.trim() || isOverLimit || isSubmitting}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add to Queue'}
        </button>
      </div>
    </form>
  );
}
