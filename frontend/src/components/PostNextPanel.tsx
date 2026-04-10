import { useState } from 'react';
import { QueueItem } from '../types';
import { Play, Send, Copy, Check } from 'lucide-react';

interface PostNextPanelProps {
  nextItem: QueueItem | null;
  onPostNow: () => void;
  onDryRun: () => void;
  isPosting: boolean;
}

function getCopyText(item: QueueItem): string {
  if (item.type === 'thread' && item.thread) {
    return item.thread.join('\n\n---\n\n');
  }
  return item.text;
}

export function PostNextPanel({ nextItem, onPostNow, onDryRun, isPosting }: PostNextPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!nextItem) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12 text-zinc-500">
        <p>No pending items in the queue.</p>
      </div>
    );
  }

  const isThread = nextItem.type === 'thread';

  const handleCopy = async () => {
    const text = getCopyText(nextItem);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-100">Next in Queue</h3>
        <p className="text-sm text-zinc-400">This item will be posted next.</p>
      </div>

      <div className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
            {isThread ? 'Thread' : 'Tweet'}
          </span>
          <span className="text-xs text-zinc-500">ID: {nextItem.id}</span>
        </div>

        {isThread && nextItem.thread ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">1</span>
                <div className="w-px flex-1 bg-zinc-800" />
              </div>
              <p className="whitespace-pre-wrap pb-2">{nextItem.text}</p>
            </div>
            {nextItem.thread.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                    {i + 2}
                  </span>
                  {i < nextItem.thread!.length - 1 && <div className="w-px flex-1 bg-zinc-800" />}
                </div>
                <p className="whitespace-pre-wrap pb-2">{t}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{nextItem.text}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPostNow}
          disabled={isPosting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPosting ? 'Posting...' : 'Post Now'}
        </button>
        <button
          onClick={onDryRun}
          disabled={isPosting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Dry Run
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}