import { useState, useEffect, useMemo } from 'react';
import { QueueItem } from '../types';
import { ChevronLeft, ChevronRight, Clock, MessageSquare, Layers, Edit2, Trash2, X } from 'lucide-react';
import * as api from '../api';

interface CalendarViewProps {
  onEdit: () => void;
  onDelete: (id: number) => void;
  onReschedule: (id: number) => void;
}

export function CalendarView({ onEdit, onDelete, onReschedule }: CalendarViewProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [scheduledItems, setScheduledItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    const loadScheduled = async () => {
      setLoading(true);
      try {
        const start = new Date(weekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        const items = await api.fetchScheduledItems(start, end);
        setScheduledItems(items);
      } catch (err) {
        console.error('Failed to load scheduled items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadScheduled();
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  const getItemsForDay = (day: Date) => {
    return scheduledItems.filter(item => {
      if (!item.scheduled_at) return false;
      const itemDate = new Date(item.scheduled_at);
      return itemDate.toDateString() === day.toDateString();
    }).sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  };

  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(now.setDate(diff)));
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.toLocaleDateString([], { month: 'short' });
    const endMonth = end.toLocaleDateString([], { month: 'short' });
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startMonth} ${start.getDate()}, ${startYear} - ${endMonth} ${end.getDate()}, ${endYear}`;
    }
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${startYear}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${startYear}`;
  };

  const truncate = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextWeek}
            className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Today
          </button>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">{formatWeekRange()}</h2>
        <div className="text-sm text-zinc-500">
          {scheduledItems.length} scheduled
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {weekDays.map((day) => {
          const dayItems = getItemsForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`flex min-h-[200px] w-full flex-col rounded-xl border p-3 ${
                isCurrentDay
                  ? 'border-zinc-600 bg-zinc-900/80'
                  : 'border-zinc-800 bg-zinc-900/30'
              }`}
            >
              <div className="mb-3 text-center">
                <div className={`text-xs font-medium uppercase tracking-wider ${
                  isCurrentDay ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {day.toLocaleDateString([], { weekday: 'short' })}
                </div>
                <div className={`text-xl font-bold ${
                  isCurrentDay ? 'text-zinc-100' : 'text-zinc-300'
                }`}>
                  {day.getDate()}
                </div>
              </div>

              <div className="space-y-1.5">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
                  </div>
                ) : dayItems.length === 0 ? (
                  <div className="py-2 text-center text-xs text-zinc-600">
                    No posts
                  </div>
                ) : (
                  dayItems.map((item) => {
                    const time = new Date(item.scheduled_at!).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit'
                    });
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group relative cursor-pointer rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-2 hover:border-zinc-600 hover:bg-zinc-800"
                      >
                        <div className="flex items-start gap-1.5">
                          {item.type === 'thread' ? (
                            <Layers className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                          ) : (
                            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-zinc-300">
                              {truncate(item.type === 'thread' ? (item.thread?.[0] || item.text) : item.text)}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                              <Clock className="h-3 w-3" />
                              {time}
                            </div>
                          </div>
                        </div>

                        <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReschedule(item.id);
                            }}
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                            title="Reschedule"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit();
                            }}
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(item.id);
                            }}
                            className="rounded p-1 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedItem.type === 'thread' ? (
                  <Layers className="h-5 w-5 text-zinc-400" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-zinc-400" />
                )}
                <h3 className="text-lg font-semibold text-zinc-100">
                  {selectedItem.type === 'thread' ? 'Thread' : 'Tweet'}
                </h3>
                <span className="text-xs text-zinc-500">
                  {new Date(selectedItem.scheduled_at!).toLocaleDateString([], {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })} at {new Date(selectedItem.scheduled_at!).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedItem.type === 'thread' && selectedItem.thread ? (
              <div className="flex flex-col gap-4">
                {selectedItem.thread.map((tweet, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                        {idx + 1}
                      </span>
                      {idx < selectedItem.thread!.length - 1 && <div className="w-px flex-1 bg-zinc-800" />}
                    </div>
                    <div className="flex-1 rounded-lg bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300">
                      {tweet}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300">
                {selectedItem.text}
              </div>
            )}

            {selectedItem.media && selectedItem.media.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedItem.media.map((m, i) => (
                  <span key={i} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    📎 {m.split('/').pop()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
