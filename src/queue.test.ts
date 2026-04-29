import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

import {
  addItem,
  getNextPending,
  loadQueue,
  markFailed,
  markPosted,
  resetToPending,
} from "./queue.ts";

const TEST_USER = "testuser";
const TEST_QUEUE_DIR = join(dirname(new URL(".", import.meta.url).pathname), "content", "queues");
const TEST_QUEUE_PATH = join(TEST_QUEUE_DIR, `${TEST_USER}.json`);

let originalQueueContents = "[]\n";

beforeEach(() => {
  mkdirSync(TEST_QUEUE_DIR, { recursive: true });
  if (existsSync(TEST_QUEUE_PATH)) {
    originalQueueContents = readFileSync(TEST_QUEUE_PATH, "utf8");
  }
  writeFileSync(TEST_QUEUE_PATH, "[]\n", "utf8");
});

afterEach(() => {
  writeFileSync(TEST_QUEUE_PATH, originalQueueContents, "utf8");
});

describe("queue management", () => {
  test("adds items and returns the next pending entry", () => {
    const item = addItem(TEST_USER, {
      type: "tweet",
      text: "Hello from the queue",
    });

    expect(item.id).toBe(1);
    expect(getNextPending(TEST_USER)?.text).toBe("Hello from the queue");
  });

  test("marks posted, failed, and retry states", () => {
    const item = addItem(TEST_USER, {
      type: "tweet",
      text: "Retry me",
    });

    markPosted(TEST_USER, item.id, "1234567890");
    expect(loadQueue(TEST_USER)[0]?.status).toBe("posted");
    expect(loadQueue(TEST_USER)[0]?.tweet_id).toBe("1234567890");

    markFailed(TEST_USER, item.id, "Rate limited");
    expect(loadQueue(TEST_USER)[0]?.status).toBe("failed");
    expect(loadQueue(TEST_USER)[0]?.error).toBe("Rate limited");

    resetToPending(TEST_USER, item.id);
    expect(loadQueue(TEST_USER)[0]?.status).toBe("pending");
    expect(loadQueue(TEST_USER)[0]?.error).toBeUndefined();
  });
});
