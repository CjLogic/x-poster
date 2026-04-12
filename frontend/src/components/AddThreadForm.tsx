import { useState } from 'react';
import { AddThreadInput } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { HashtagSelector } from './HashtagSelector';
import { DateTimePicker } from './DateTimePicker';

interface AddThreadFormProps {
  onSubmit: (data: AddThreadInput) => Promise<void>;
}

export function AddThreadForm({ onSubmit }: AddThreadFormProps) {
  const [tweets, setTweets] = useState<string[]>(['', '']);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTweetChange = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index] = value;
    setTweets(newTweets);
  };

  const addTweet = () => {
    setTweets([...tweets, '']);
  };

  const removeTweet = (index: number) => {
    if (tweets.length <= 2) return;
    const newTweets = [...tweets];
    newTweets.splice(index, 1);
    setTweets(newTweets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validTweets = tweets.map(t => t.trim()).filter(Boolean);
    if (validTweets.length < 2) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'thread',
        text: validTweets[0],
        thread: validTweets.slice(1),
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      });
      setTweets(['', '']);
      setScheduledAt(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = tweets.every(t => t.trim().length > 0 && t.length <= 280) && tweets.length >= 2;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex flex-col gap-4">
        {tweets.map((tweet, index) => {
          const isOverLimit = tweet.length > 280;
          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center gap-2 pt-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                  {index + 1}
                </span>
                {index < tweets.length - 1 && <div className="w-px flex-1 bg-zinc-800" />}
              </div>
              
              <div className="flex flex-1 flex-col gap-2">
                <textarea
                  value={tweet}
                  onChange={(e) => handleTweetChange(index, e.target.value)}
                  placeholder={index === 0 ? "Start a thread..." : "Add another tweet..."}
                  className="min-h-[100px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                {index === 0 && <HashtagSelector text={tweet} onChange={(v) => handleTweetChange(index, v)} />}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => removeTweet(index)}
                    disabled={tweets.length <= 2}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-red-400 disabled:opacity-50 disabled:hover:text-zinc-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                  <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
                    {tweet.length} / 280
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={addTweet}
          className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Plus className="h-4 w-4" /> Add Tweet
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <DateTimePicker value={scheduledAt} onChange={setScheduledAt} label="Schedule" />
        
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : scheduledAt ? 'Schedule Thread' : 'Add Thread to Queue'}
        </button>
      </div>
    </form>
  );
}
