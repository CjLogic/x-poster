import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, X, ChevronDown } from 'lucide-react';

interface DateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

const QUICK_OPTIONS = [
  { label: 'Now', value: null },
  { label: '+1h', hours: 1 },
  { label: '+2h', hours: 2 },
  { label: 'Tonight', time: '20:00' },
  { label: 'Tomorrow', days: 1, time: '09:00' },
  { label: 'Next Week', days: 7, time: '09:00' },
];

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [showCustom, setShowCustom] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setCustomDate(d.toISOString().split('T')[0]);
      setCustomTime(d.toTimeString().slice(0, 5));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowCustom(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleQuickSelect = (option: typeof QUICK_OPTIONS[0]) => {
    if (option.value === null) {
      onChange(null);
      setIsOpen(false);
      return;
    }

    const d = new Date();
    
    if (option.hours) {
      d.setHours(d.getHours() + option.hours);
    } else {
      if (option.days) {
        d.setDate(d.getDate() + option.days);
      }
      if (option.time) {
        const [h, m] = option.time.split(':');
        d.setHours(parseInt(h), parseInt(m), 0, 0);
      }
    }
    
    onChange(d.toISOString());
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    if (!customDate) {
      onChange(null);
    } else {
      const dateTime = new Date(`${customDate}T${customTime}:00`);
      onChange(dateTime.toISOString());
    }
    setIsOpen(false);
    setShowCustom(false);
  };

  const formatDisplay = () => {
    if (!value) return 'Now';
    const d = new Date(value);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days === 0) {
      if (hours < 1) return `in ${Math.floor(diff / (1000 * 60))}m`;
      if (hours < 24) return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (days === 1) return `Tomorrow ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (days < 7) return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-xs font-medium text-zinc-400">{label}</label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
          value
            ? 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-zinc-500'
            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatDisplay()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-[100] mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
        >
          {/* Quick Options Grid */}
          <div className="grid grid-cols-3 gap-1 p-2">
            {QUICK_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSelect(option)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  (option.value === null && !value) ||
                  (option.label === 'Now' && !value)
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Time Presets */}
          <div className="border-t border-zinc-800 px-2 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Today at</p>
            <div className="flex flex-wrap gap-1">
              {['09:00', '12:00', '15:00', '17:30', '20:00', '22:00'].map((t) => {
                const [h] = t.split(':');
                const label = parseInt(h) < 12 ? `${h}am` : parseInt(h) === 12 ? '12pm' : `${parseInt(h) - 12}pm`;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const [hours, mins] = t.split(':');
                      d.setHours(parseInt(hours), parseInt(mins), 0, 0);
                      if (d < new Date()) d.setDate(d.getDate() + 1);
                      onChange(d.toISOString());
                      setIsOpen(false);
                    }}
                    className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Toggle */}
          <div className="border-t border-zinc-800 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setShowCustom(!showCustom)}
              className="flex w-full items-center justify-between text-xs text-zinc-400 hover:text-zinc-200"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Custom date & time
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Custom Inputs - Collapsible */}
          {showCustom && (
            <div className="border-t border-zinc-800 px-2 pb-2 pt-1.5">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={getMinDate()}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setIsOpen(false);
                  }}
                  className="flex-1 rounded border border-zinc-700 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customDate}
                  className="flex-1 rounded bg-zinc-100 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                >
                  {customDate ? 'Schedule' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {/* Clear Button */}
          {value && (
            <div className="border-t border-zinc-800 px-2 py-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setShowCustom(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded py-1 text-xs text-zinc-500 hover:text-red-400"
              >
                <X className="h-3 w-3" />
                Clear schedule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
