import { useState, useEffect, useCallback } from 'react';
import { Hash, Plus, X, Check } from 'lucide-react';

const STORAGE_KEY = 'x-poster-hashtags';

const DEFAULT_HASHTAGS = [
  '#BuildInPublic',
  '#IndieHackers',
  '#Startup',
  '#TechTwitter',
  '#DevLife',
];

interface HashtagSelectorProps {
  text: string;
  onChange: (newText: string) => void;
}

export function HashtagSelector({ text, onChange }: HashtagSelectorProps) {
  const [savedHashtags, setSavedHashtags] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedHashtags(JSON.parse(stored));
      } catch {
        setSavedHashtags(DEFAULT_HASHTAGS);
      }
    } else {
      setSavedHashtags(DEFAULT_HASHTAGS);
    }
  }, []);

  const persistHashtags = useCallback((hashtags: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hashtags));
    setSavedHashtags(hashtags);
  }, []);

  const addHashtag = useCallback(
    (hashtag: string) => {
      const clean = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
      if (text.includes(clean)) return;

      const newText = text.trim().endsWith(' ') ? `${text}${clean}` : `${text} ${clean}`;
      onChange(newText);
    },
    [text, onChange],
  );

  const addNewHashtag = useCallback(() => {
    if (!newHashtag.trim()) return;
    const clean = newHashtag.startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
    if (!savedHashtags.includes(clean)) {
      persistHashtags([...savedHashtags, clean]);
    }
    addHashtag(clean);
    setNewHashtag('');
    setShowAddInput(false);
  }, [newHashtag, savedHashtags, persistHashtags, addHashtag]);

  const removeHashtag = useCallback(
    (hashtag: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const cleaned = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
      const newText = text.replace(cleaned, '').replace(/\s+/g, ' ').trim();
      onChange(newText);
    },
    [text, onChange],
  );

  const activeHashtags = savedHashtags.filter((tag) => text.includes(tag));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <Hash className="h-4 w-4" />
          <span>Hashtags</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddInput(!showAddInput)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {showAddInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewHashtag()}
            placeholder="#NewHashtag"
            className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={addNewHashtag}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            Save
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {savedHashtags.map((hashtag) => {
          const isActive = activeHashtags.includes(hashtag);
          return (
            <button
              key={hashtag}
              type="button"
              onClick={() => addHashtag(hashtag)}
              className={`group flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {hashtag}
              {isActive && <Check className="h-3 w-3" />}
              {!isActive && (
                <span className="invisible ml-0.5 group-hover:visible">
                  <Plus className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-zinc-800 pt-2">
          <span className="text-xs text-zinc-600">Active:</span>
          {activeHashtags.map((hashtag) => (
            <button
              key={hashtag}
              type="button"
              onClick={(e) => removeHashtag(hashtag, e)}
              className="flex items-center gap-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400 hover:bg-blue-500/30"
              title="Remove hashtag"
            >
              {hashtag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}