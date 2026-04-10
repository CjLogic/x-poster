import { useState, useCallback } from 'react';

export function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyText = useCallback(async (text: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  return { copiedId, copyText };
}