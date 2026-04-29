import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { HashtagSelector } from './HashtagSelector';

interface QuickAddProps {
  onAdd: (text: string) => Promise<void>;
}

export function QuickAdd({ onAdd }: QuickAddProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(text.trim());
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverLimit = text.length > 280;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
        <Plus className="h-4 w-4" />
        <span>Quick Add</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        className="min-h-[80px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      />

      <HashtagSelector text={text} onChange={setText} />

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
          {text.length} / 280
        </span>
        <button
          type="submit"
          disabled={!text.trim() || isOverLimit || isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting ? 'Adding...' : 'Add to Queue'}
        </button>
      </div>
    </form>
  );
}
