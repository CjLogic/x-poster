import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QueueItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { ExternalLink, Play, SkipForward, RotateCcw, Trash2, MessageSquare, Layers, Copy, Check, GripVertical, Pencil, X, Plus, Trash } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';

interface QueueItemCardProps {
  item: QueueItem;
  index: number;
  onSkip: (id: number) => void;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
  onPostNow: (id: number) => void;
  onDryRun: (id: number) => void;
  onEdit: (id: number, text: string, thread?: string[], scheduledAt?: string | null) => void;
}

function getCopyText(item: QueueItem): string {
  if (item.type === 'thread' && item.thread) {
    return item.thread.join('\n\n---\n\n');
  }
  return item.text;
}

export function QueueItemCard({ item, index, onSkip, onRetry, onDelete, onPostNow, onDryRun, onEdit }: QueueItemCardProps) {
  const isThread = item.type === 'thread';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editThread, setEditThread] = useState<string[]>(item.thread || ['']);
  const [editScheduledAt, setEditScheduledAt] = useState<string | null>(item.scheduled_at || null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      className="flex h-full min-h-[160px] flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg shadow-black/30 transition-colors hover:bg-zinc-900"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="flex cursor-grab items-center justify-center rounded text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              {isThread ? <Layers className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-200">
                {isThread ? 'Thread' : 'Tweet'}
              </span>
              <span className="text-xs text-zinc-500">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="flex h-6 min-w-6 items-center justify-center rounded bg-zinc-700 px-1.5 text-xs font-medium text-zinc-300">
              {index + 1}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.status === 'pending' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700" title="Copy">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </button>
              <button onClick={() => {
                setEditText(item.text);
                setEditThread(item.thread || ['']);
                setEditScheduledAt(item.scheduled_at || null);
                setIsEditing(true);
              }} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => onDryRun(item.id)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                <Play className="h-3.5 w-3.5" /> Dry Run
              </button>
              <button onClick={() => onPostNow(item.id)} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white">
                Post Now
              </button>
              <button onClick={() => onSkip(item.id)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700">
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
            </>
          )}

          {item.status === 'failed' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => onRetry(item.id)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
              <button onClick={() => onSkip(item.id)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700">
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
            </>
          )}

          {item.status === 'skipped' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => onRetry(item.id)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </>
          )}

          {item.status === 'posted' && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {item.tweet_id && (
                <a href={`https://x.com/i/web/status/${item.tweet_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700">
                  <ExternalLink className="h-3.5 w-3.5" /> View
                </a>
              )}
            </>
          )}

          <button onClick={() => {
            if (confirm('Delete?')) {
              onDelete(item.id);
            }
          }} className="ml-auto flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-lg bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-300">
        {isThread && item.thread ? (
          <p className="line-clamp-3">{item.thread[0]}</p>
        ) : (
          <p className="line-clamp-3">{item.text}</p>
        )}
      </div>

      {item.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {item.error.slice(0, 80)}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full h-[50%] max-w-4xl rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Edit {isThread ? 'Thread' : 'Tweet'}</h3>
              <button onClick={() => setIsEditing(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {isThread ? (
                <div className="flex flex-col gap-3">
                  {editThread.map((tweet, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                          {idx + 1}
                        </span>
                        {idx < editThread.length - 1 && <div className="w-px flex-1 bg-zinc-800" />}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <textarea
                          value={tweet}
                          onChange={(e) => {
                            const newThread = [...editThread];
                            newThread[idx] = e.target.value;
                            setEditThread(newThread);
                          }}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                          rows={3}
                        />
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${tweet.length > 280 ? 'text-red-500' : 'text-zinc-500'}`}>
                            {tweet.length} / 280
                          </span>
                          {editThread.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setEditThread(editThread.filter((_, i) => i !== idx))}
                              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-400"
                            >
                              <Trash className="h-3 w-3" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditThread([...editThread, ''])}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 px-4 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-300"
                  >
                    <Plus className="h-4 w-4" /> Add Tweet
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${editText.length > 280 ? 'text-red-500' : 'text-zinc-500'}`}>
                      {editText.length} / 280
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                <DateTimePicker
                  value={editScheduledAt}
                  onChange={setEditScheduledAt}
                  label="Schedule"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (isThread) {
                    const validThread = editThread.map(t => t.trim()).filter(Boolean);
                    if (validThread.length >= 2) {
                      onEdit(item.id, validThread[0], validThread, editScheduledAt);
                    }
                  } else {
                    if (editText.trim()) {
                      onEdit(item.id, editText, undefined, editScheduledAt);
                    }
                  }
                  setIsEditing(false);
                }}
                disabled={isThread ? editThread.filter(t => t.trim()).length < 2 : !editText.trim()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
