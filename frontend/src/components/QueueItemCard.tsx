import { useState } from 'react';
import { QueueItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { ExternalLink, Play, SkipForward, RotateCcw, Trash2, MessageSquare, Layers, Copy, Check } from 'lucide-react';

interface QueueItemCardProps {
  item: QueueItem;
  onSkip: (id: number) => void;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
  onPostNow: (id: number) => void;
  onDryRun: (id: number) => void;
}

function getCopyText(item: QueueItem): string {
  if (item.type === 'thread' && item.thread) {
    return item.thread.join('\n\n---\n\n');
  }
  return item.text;
}

export function QueueItemCard({ item, onSkip, onRetry, onDelete, onPostNow, onDryRun }: QueueItemCardProps) {
  const isThread = item.type === 'thread';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = getCopyText(item);
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
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
            {isThread ? <Layers className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                {isThread ? 'Thread' : 'Tweet'}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div className="text-xs text-zinc-500">
              Created {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {item.status === 'pending' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700" title="Copy to clipboard">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => onDryRun(item.id)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                <Play className="h-3.5 w-3.5" /> Dry Run
              </button>
              <button onClick={() => onPostNow(item.id)} className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white">
                Post Now
              </button>
              <button onClick={() => onSkip(item.id)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
            </>
          )}
          
          {item.status === 'failed' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700" title="Copy to clipboard">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => onRetry(item.id)} className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
              <button onClick={() => onSkip(item.id)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
            </>
          )}
          
          {item.status === 'skipped' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700" title="Copy to clipboard">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => onRetry(item.id)} className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </>
          )}

          {item.status === 'posted' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700" title="Copy to clipboard">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {item.tweet_id && (
                <a href={`https://x.com/i/web/status/${item.tweet_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
                  <ExternalLink className="h-3.5 w-3.5" /> View on X
                </a>
              )}
            </>
          )}
          
          <button onClick={() => {
            if (confirm('Are you sure you want to delete this item?')) {
              onDelete(item.id);
            }
          }} className="ml-2 flex items-center justify-center rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300">
        {isThread && item.thread ? (
          <div className="flex flex-col gap-3">
            {item.thread.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                    {i + 1}
                  </span>
                  {i < item.thread!.length - 1 && <div className="w-px flex-1 bg-zinc-800" />}
                </div>
                <p className="whitespace-pre-wrap pb-2">{t}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{item.text}</p>
        )}
        
        {item.media && item.media.length > 0 && (
          <div className="mt-3 flex gap-2">
            {item.media.map((m, i) => (
              <span key={i} className="inline-flex items-center rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                Media: {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {item.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <span className="font-semibold">Error:</span> {item.error}
        </div>
      )}
    </div>
  );
}