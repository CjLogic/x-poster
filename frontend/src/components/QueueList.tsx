import { useState } from 'react';
import { QueueItem } from '../types';
import { QueueItemCard } from './QueueItemCard';

interface QueueListProps {
  items: QueueItem[];
  onSkip: (id: number) => void;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
  onPostNow: (id: number) => void;
  onDryRun: (id: number) => void;
}

type FilterStatus = 'all' | 'pending' | 'posted' | 'failed' | 'skipped';

export function QueueList({ items, onSkip, onRetry, onDelete, onPostNow, onDryRun }: QueueListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filteredItems = items.filter(item => filter === 'all' || item.status === filter);

  const tabs: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'posted', label: 'Posted' },
    { id: 'failed', label: 'Failed' },
    { id: 'skipped', label: 'Skipped' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12 text-zinc-500">
            <p>No items found in this category.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <QueueItemCard
              key={item.id}
              item={item}
              onSkip={onSkip}
              onRetry={onRetry}
              onDelete={onDelete}
              onPostNow={onPostNow}
              onDryRun={onDryRun}
            />
          ))
        )}
      </div>
    </div>
  );
}
