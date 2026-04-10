import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";

import {
  addItem,
  getNextPending,
  getQueuePath,
  loadQueue,
  markFailed,
  markPosted,
  resetToPending,
} from "./queue.ts";

let originalQueueContents = "[]\n";

beforeEach(() => {
  originalQueueContents = readFileSync(getQueuePath(), "utf8");
  writeFileSync(getQueuePath(), "[]\n", "utf8");
});

afterEach(() => {
  writeFileSync(getQueuePath(), originalQueueContents, "utf8");
});

describe("queue management", () => {
  test("adds items and returns the next pending entry", () => {
    const item = addItem({
      type: "tweet",
      text: "Hello from the queue",
    });

    expect(item.id).toBe(1);
    expect(getNextPending()?.text).toBe("Hello from the queue");
  });

  test("marks posted, failed, and retry states", () => {
    const item = addItem({
      type: "tweet",
      text: "Retry me",
    });

    markPosted(item.id, "1234567890");
    expect(loadQueue()[0]?.status).toBe("posted");
    expect(loadQueue()[0]?.tweet_id).toBe("1234567890");

    markFailed(item.id, "Rate limited");
    expect(loadQueue()[0]?.status).toBe("failed");
    expect(loadQueue()[0]?.error).toBe("Rate limited");

    resetToPending(item.id);
    expect(loadQueue()[0]?.status).toBe("pending");
    expect(loadQueue()[0]?.error).toBeUndefined();
  });
});
