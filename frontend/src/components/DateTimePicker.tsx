import { useState, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

const SUGGESTED_TIMES = [
  { label: 'Morning', time: '09:00', description: '9:00 AM - People checking feeds' },
  { label: 'Lunch', time: '12:00', description: '12:00 PM - Midday scroll' },
  { label: 'Evening', time: '17:30', description: '5:30 PM - Commute time' },
  { label: 'Night', time: '20:00', description: '8:00 PM - Relaxed browsing' },
];

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
  }, [value]);

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleApply = () => {
    if (!date) {
      onChange(null);
      setIsOpen(false);
      return;
    }
    const dateTime = new Date(`${date}T${time}:00`);
    onChange(dateTime.toISOString());
    setIsOpen(false);
  };

  const handleQuickSelect = (daysToAdd: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    d.setHours(hour, 0, 0, 0);
    setDate(d.toISOString().split('T')[0]);
    setTime(`${hour.toString().padStart(2, '0')}:00`);
  };

  const handleClear = () => {
    onChange(null);
    setDate('');
    setTime('09:00');
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!value) return 'Now';
    const d = new Date(value);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return `Today at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (days === 1) return `Tomorrow at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (days < 7) return `${d.toLocaleDateString([], { weekday: 'short' })} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-zinc-300">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
          value
            ? 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-zinc-500'
            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDisplay()}</span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 rounded p-0.5 hover:bg-zinc-700"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Quick Schedule</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(0, 9)}
                className="flex flex-col items-start rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-left hover:border-zinc-600 hover:bg-zinc-800"
              >
                <span className="text-sm font-medium text-zinc-200">Today</span>
                <span className="text-xs text-zinc-500">9:00 AM</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(1, 9)}
                className="flex flex-col items-start rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-left hover:border-zinc-600 hover:bg-zinc-800"
              >
                <span className="text-sm font-medium text-zinc-200">Tomorrow</span>
                <span className="text-xs text-zinc-500">9:00 AM</span>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Suggested Times</p>
            <div className="space-y-1">
              {SUGGESTED_TIMES.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    if (d.getHours() >= parseInt(slot.time.split(':')[0])) {
                      d.setDate(d.getDate() + 1);
                    }
                    d.setHours(parseInt(slot.time.split(':')[0]), 0, 0, 0);
                    setDate(d.toISOString().split('T')[0]);
                    setTime(slot.time);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-800"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-200">{slot.label}</span>
                    <span className="ml-2 text-xs text-zinc-500">{slot.description}</span>
                  </div>
                  <span className="text-sm text-zinc-400">{slot.time}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 border-t border-zinc-800 pt-4">
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Custom Date & Time</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
              <div className="w-24">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!date}
              className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
            >
              {date ? 'Schedule' : 'Post Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
