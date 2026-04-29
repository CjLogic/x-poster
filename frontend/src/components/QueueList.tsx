import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { QueueItem } from '../types';
import { QueueItemCard } from './QueueItemCard';

interface QueueListProps {
  items: QueueItem[];
  onSkip: (id: number) => void;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
  onPostNow: (id: number) => void;
  onDryRun: (id: number) => void;
  onReorder: (orderedIds: number[]) => void;
  onEdit: (id: number, text: string, thread?: string[], scheduledAt?: string | null) => void;
}

type FilterStatus = 'all' | 'pending' | 'posted' | 'failed' | 'skipped';

export function QueueList({ items, onSkip, onRetry, onDelete, onPostNow, onDryRun, onReorder, onEdit }: QueueListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredItems = items.filter(item => filter === 'all' || item.status === filter);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredItems.findIndex(item => item.id === active.id);
      const newIndex = filteredItems.findIndex(item => item.id === over.id);
      const newOrderedItems = [...filteredItems];
      const [removed] = newOrderedItems.splice(oldIndex, 1);
      newOrderedItems.splice(newIndex, 0, removed);
      onReorder(newOrderedItems.map(item => item.id));
    }
  };

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredItems.map(item => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12 text-zinc-500">
                <p>No items found in this category.</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onSkip={onSkip}
                  onRetry={onRetry}
                  onDelete={onDelete}
                  onPostNow={onPostNow}
                  onDryRun={onDryRun}
                  onEdit={onEdit}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
