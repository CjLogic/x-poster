import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { AddQueueItemInput, QueueItem } from "./types.ts";

const PROJECT_ROOT = resolve(new URL("..", import.meta.url).pathname);

function getQueuesDir(): string {
  const dir = join(PROJECT_ROOT, "content", "queues");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function getQueuePath(username: string): string {
  return join(getQueuesDir(), `${username}.json`);
}

function ensureQueueFile(username: string): void {
  const queuePath = getQueuePath(username);
  mkdirSync(dirname(queuePath), { recursive: true });

  try {
    readFileSync(queuePath, "utf8");
  } catch {
    writeFileSync(queuePath, "[]\n", "utf8");
  }
}

function updateItem(
  username: string,
  id: number,
  updater: (item: QueueItem) => QueueItem,
): QueueItem {
  const items = loadQueue(username);
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
  saveQueue(username, items);
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

export function loadQueue(username: string): QueueItem[] {
  ensureQueueFile(username);
  const queuePath = getQueuePath(username);
  const raw = readFileSync(queuePath, "utf8").trim();

  if (raw.length === 0) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Queue file is invalid. Expected a JSON array.");
  }

  return parsed as QueueItem[];
}

export function saveQueue(username: string, items: QueueItem[]): void {
  const queuePath = getQueuePath(username);
  writeFileSync(queuePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export function getNextPending(username: string): QueueItem | undefined {
  return loadQueue(username).find((item) => item.status === "pending");
}

export function addItem(username: string, item: AddQueueItemInput): QueueItem {
  const items = loadQueue(username);
  const nextId = items.length === 0 ? 1 : Math.max(...items.map((entry) => entry.id)) + 1;

  const newItem: QueueItem = {
    id: nextId,
    type: item.type,
    status: "pending",
    text: item.text,
    created_at: new Date().toISOString(),
    ...(item.thread ? { thread: item.thread } : {}),
    ...(item.media && item.media.length > 0 ? { media: item.media } : {}),
    ...(item.scheduled_at ? { scheduled_at: item.scheduled_at } : {}),
  };

  items.push(newItem);
  saveQueue(username, items);
  return newItem;
}

export function markPosted(username: string, id: number, tweetId: string, threadIds?: string[]): QueueItem {
  return updateItem(username, id, (item) => {
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

export function markFailed(username: string, id: number, error: string): QueueItem {
  return updateItem(username, id, (item) => ({
    ...item,
    status: "failed",
    error,
  }));
}

export function markSkipped(username: string, id: number): QueueItem {
  return updateItem(username, id, (item) => {
    const { error: _error, ...rest } = item;

    return stripUndefinedFields({
      ...rest,
      status: "skipped",
    });
  });
}

export function resetToPending(username: string, id: number): QueueItem {
  return updateItem(username, id, (item) => {
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

export function deleteItem(username: string, id: number): QueueItem {
  const items = loadQueue(username);
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Queue item #${id} was not found.`);
  }

  const deleted = items[index]!;
  items.splice(index, 1);
  saveQueue(username, items);
  return deleted;
}

export function reorderItems(username: string, orderedIds: number[]): QueueItem[] {
  const items = loadQueue(username);
  const itemMap = new Map(items.map(item => [item.id, item]));
  const reordered: QueueItem[] = [];

  for (const id of orderedIds) {
    const item = itemMap.get(id);
    if (!item) {
      throw new Error(`Queue item #${id} was not found.`);
    }
    reordered.push(item);
  }

  saveQueue(username, reordered);
  return reordered;
}

export function getQueueStats(username: string) {
  const items = loadQueue(username);
  return {
    pending: items.filter((i) => i.status === "pending").length,
    posted: items.filter((i) => i.status === "posted").length,
    failed: items.filter((i) => i.status === "failed").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    total: items.length,
  };
}

export function getDueScheduledItems(username: string): QueueItem[] {
  const items = loadQueue(username);
  const now = new Date();
  return items.filter((item) => {
    if (item.status !== "pending" || !item.scheduled_at) return false;
    return new Date(item.scheduled_at) <= now;
  });
}

export function getScheduledItems(username: string, startDate: Date, endDate: Date): QueueItem[] {
  const items = loadQueue(username);
  return items.filter((item) => {
    if (!item.scheduled_at) return false;
    const scheduledDate = new Date(item.scheduled_at);
    return scheduledDate >= startDate && scheduledDate <= endDate;
  });
}

export function updateItemScheduledAt(username: string, id: number, scheduledAt: string | null): QueueItem {
  return updateItem(username, id, (item) => {
    if (scheduledAt) {
      return { ...item, scheduled_at: scheduledAt };
    }
    const { scheduled_at: _scheduledAt, ...rest } = item;
    return rest as QueueItem;
  });
}

export function updateItemText(
  username: string,
  id: number,
  text: string,
  thread?: string[],
): QueueItem {
  return updateItem(username, id, (item) => {
    if (item.type === "thread" && thread) {
      return { ...item, thread };
    }
    return { ...item, text };
  });
}
