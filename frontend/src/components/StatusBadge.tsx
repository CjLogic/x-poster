import { QueueItem } from '../types';

export function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    posted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    skipped: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
