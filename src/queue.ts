import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { AddQueueItemInput, QueueItem } from "./types.ts";

const PROJECT_ROOT = resolve(new URL("..", import.meta.url).pathname);
const QUEUE_PATH = join(PROJECT_ROOT, "content", "queue.json");

function ensureQueueFile(): void {
  mkdirSync(dirname(QUEUE_PATH), { recursive: true });

  try {
    readFileSync(QUEUE_PATH, "utf8");
  } catch {
    writeFileSync(QUEUE_PATH, "[]\n", "utf8");
  }
}

function updateItem(
  id: number,
  updater: (item: QueueItem) => QueueItem,
): QueueItem {
  const items = loadQueue();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Queue item #${id} was not found.`);
  }

  const currentItem = items[index];

  if (!currentItem) {
    throw new Error(`Queue item #${id} was not found.`);
  }

  const updatedItem = updater(currentItem);
  items[index] = updatedItem;
  saveQueue(items);
  return updatedItem;
}

function stripUndefinedFields(item: QueueItem): QueueItem {
  const sanitized: QueueItem = {
    id: item.id,
    type: item.type,
    status: item.status,
    text: item.text,
    created_at: item.created_at,
    ...(item.thread ? { thread: item.thread } : {}),
    ...(item.media ? { media: item.media } : {}),
    ...(item.posted_at ? { posted_at: item.posted_at } : {}),
    ...(item.tweet_id ? { tweet_id: item.tweet_id } : {}),
    ...(item.thread_ids ? { thread_ids: item.thread_ids } : {}),
    ...(item.error ? { error: item.error } : {}),
  };

  return sanitized;
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

export function getQueuePath(): string {
  return QUEUE_PATH;
}

export function loadQueue(): QueueItem[] {
  ensureQueueFile();
  const raw = readFileSync(QUEUE_PATH, "utf8").trim();

  if (raw.length === 0) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Queue file is invalid. Expected a JSON array.");
  }

  return parsed as QueueItem[];
}

export function saveQueue(items: QueueItem[]): void {
  ensureQueueFile();
  writeFileSync(QUEUE_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export function getNextPending(): QueueItem | undefined {
  return loadQueue().find((item) => item.status === "pending");
}

export function addItem(item: AddQueueItemInput): QueueItem {
  const items = loadQueue();
  const nextId = items.length === 0 ? 1 : Math.max(...items.map((entry) => entry.id)) + 1;

  const newItem: QueueItem = {
    id: nextId,
    type: item.type,
    status: "pending",
    text: item.text,
    created_at: new Date().toISOString(),
    ...(item.thread ? { thread: item.thread } : {}),
    ...(item.media && item.media.length > 0 ? { media: item.media } : {}),
  };

  items.push(newItem);
  saveQueue(items);
  return newItem;
}

export function markPosted(id: number, tweetId: string, threadIds?: string[]): QueueItem {
  return updateItem(id, (item) => {
    const { error: _error, ...rest } = item;

    return stripUndefinedFields({
      ...rest,
      status: "posted",
      posted_at: new Date().toISOString(),
      tweet_id: tweetId,
      ...(threadIds && threadIds.length > 0 ? { thread_ids: threadIds } : {}),
    });
  });
}

export function markFailed(id: number, error: string): QueueItem {
  return updateItem(id, (item) => ({
    ...item,
    status: "failed",
    error,
  }));
}

export function markSkipped(id: number): QueueItem {
  return updateItem(id, (item) => {
    const { error: _error, ...rest } = item;

    return stripUndefinedFields({
      ...rest,
      status: "skipped",
    });
  });
}

export function resetToPending(id: number): QueueItem {
  return updateItem(id, (item) => {
    const {
      posted_at: _postedAt,
      tweet_id: _tweetId,
      thread_ids: _threadIds,
      error: _error,
      ...rest
    } = item;

    return stripUndefinedFields({
      ...rest,
      status: "pending",
    });
  });
}

export function deleteItem(id: number): QueueItem {
  const items = loadQueue();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Queue item #${id} was not found.`);
  }

  const deleted = items[index]!;
  items.splice(index, 1);
  saveQueue(items);
  return deleted;
}
