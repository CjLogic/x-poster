import { QueueStats } from '../types';
import { Clock, CheckCircle2, XCircle, SkipForward, ListTodo } from 'lucide-react';

export function StatsCards({ stats }: { stats: QueueStats | null }) {
  if (!stats) return null;

  const total = stats.pending + stats.posted + stats.failed + stats.skipped;

  const cards = [
    { label: 'Total', value: total, icon: ListTodo, color: 'text-zinc-400' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
    { label: 'Posted', value: stats.posted, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-500' },
    { label: 'Skipped', value: stats.skipped, icon: SkipForward, color: 'text-zinc-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            {card.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-100">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
