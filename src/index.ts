import { config } from "dotenv";

import { checkRateLimits, postThread, postTweet, uploadMedia } from "./api.ts";
import {
  addItem,
  getNextPending,
  loadQueue,
  markFailed,
  markPosted,
  markSkipped,
  resetToPending,
} from "./queue.ts";
import type { AddQueueItemInput, QueueItem, QueueItemStatus } from "./types.ts";

config();

const X_HANDLE = "CjRamirez333";

interface ParsedAddCommand {
  item: AddQueueItemInput;
}

function exitWithError(message: string): never {
  throw new Error(message);
}

function truncate(text: string, maxLength = 56): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function formatDateLabel(dateValue?: string): string {
  if (!dateValue) {
    return "unknown date";
  }

  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getTweetUrl(tweetId: string): string {
  return `https://x.com/${X_HANDLE}/status/${tweetId}`;
}

function parseId(rawValue: string | undefined, command: string): number {
  if (!rawValue) {
    exitWithError(`Usage: bun run src/index.ts ${command} <id>`);
  }

  const id = Number(rawValue);

  if (!Number.isInteger(id) || id <= 0) {
    exitWithError(`Invalid queue item id: ${rawValue}`);
  }

  return id;
}

function printUsage(): void {
  console.log("x-poster commands:");
  console.log("  bun run src/index.ts post [--dry-run]");
  console.log("  bun run src/index.ts list [--pending|--posted|--failed|--skipped]");
  console.log('  bun run src/index.ts add "Your tweet text here" [--media ./path.png]');
  console.log(
    '  bun run src/index.ts add --thread --text "First tweet" --text "Second tweet"',
  );
  console.log("  bun run src/index.ts skip <id>");
  console.log("  bun run src/index.ts retry <id>");
}

function parseAddCommand(args: string[]): ParsedAddCommand {
  let isThread = false;
  const threadTexts: string[] = [];
  const media: string[] = [];
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === "--thread") {
      isThread = true;
      continue;
    }

    if (arg === "--text") {
      const value = args[index + 1];
      if (!value) {
        exitWithError("Missing value after --text.");
      }

      threadTexts.push(value);
      index += 1;
      continue;
    }

    if (arg === "--media") {
      const value = args[index + 1];
      if (!value) {
        exitWithError("Missing value after --media.");
      }

      media.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      exitWithError(`Unknown add option: ${arg}`);
    }

    positional.push(arg);
  }

  if (isThread) {
    if (media.length > 0) {
      exitWithError("Thread media is not supported. Add media only to single tweets.");
    }

      if (threadTexts.length === 0) {
        exitWithError("Thread mode requires at least one --text value.");
      }

      const firstTweet = threadTexts[0];
      if (!firstTweet) {
        exitWithError("Thread mode requires at least one --text value.");
      }

      return {
        item: {
          type: "thread",
          text: firstTweet,
          thread: threadTexts,
        },
      };
  }

  if (threadTexts.length > 0 && positional.length > 0) {
    exitWithError("Use either positional tweet text or --text values, not both.");
  }

  const text = positional[0] ?? threadTexts[0];
  if (!text) {
    exitWithError("Add requires tweet text.");
  }

  return {
    item: {
      type: "tweet",
      text,
      ...(media.length > 0 ? { media } : {}),
    },
  };
}

function printQueue(items: QueueItem[]): void {
  console.log(`📋 Queue (${items.length} item${items.length === 1 ? "" : "s"})`);

  if (items.length === 0) {
    console.log("   No queue items found.");
    return;
  }

  for (const item of items) {
    const summary = item.type === "thread" ? item.thread?.[0] ?? item.text : item.text;
    const detail =
      item.status === "posted"
        ? `(posted ${formatDateLabel(item.posted_at)})`
        : item.status === "failed" && item.error
          ? `(Error: ${truncate(item.error, 40)})`
          : "";

    console.log(
      `   #${item.id} [${item.status}] "${truncate(summary)}" ${detail}`.trimEnd(),
    );
  }
}

function printDryRun(item: QueueItem): void {
  console.log("🔍 DRY RUN — Would post:");
  console.log(`   Type: ${item.type}`);

  if (item.type === "thread") {
    console.log(`   Tweets: ${item.thread?.length ?? 0}`);
    item.thread?.forEach((tweet, index) => {
      console.log(`   ${index + 1}. "${tweet}"`);
    });
  } else {
    console.log(`   Text: "${item.text}"`);
  }

  console.log(`   Media: ${item.media && item.media.length > 0 ? item.media.join(", ") : "none"}`);
}

async function handlePost(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const nextItem = getNextPending();

  if (!nextItem) {
    console.log("No pending queue items to post.");
    return;
  }

  if (dryRun) {
    printDryRun(nextItem);
    return;
  }

  try {
    try {
      const rateLimit = await checkRateLimits();
      if (rateLimit.remaining !== null) {
        console.log(
          `Rate limit: ${rateLimit.remaining}/${rateLimit.limit ?? "?"} posts remaining${
            rateLimit.resetAt ? ` (resets ${rateLimit.resetAt})` : ""
          }`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Rate limit lookup skipped: ${message}`);
    }

    if (nextItem.type === "thread") {
      const threadTexts = nextItem.thread ?? [];

      if (threadTexts.length === 0) {
        exitWithError(`Thread #${nextItem.id} has no tweets.`);
      }

      const responses = await postThread(threadTexts);
      const threadIds = responses.map((response) => response.data.id);
      const firstId = threadIds[0];

      if (!firstId) {
        exitWithError(`Thread #${nextItem.id} posted but no tweet id was returned.`);
      }

      markPosted(nextItem.id, firstId, threadIds);

      console.log(`✅ Posted thread #${nextItem.id} (${responses.length} tweets)`);
      responses.forEach((response, index) => {
        console.log(`   Tweet ${index + 1}: ${response.data.id} ${getTweetUrl(response.data.id)}`);
      });
      return;
    }

    const mediaIds = nextItem.media
      ? await Promise.all(nextItem.media.map((filePath) => uploadMedia(filePath)))
      : [];

    const response = await postTweet(nextItem.text, undefined, mediaIds);
    markPosted(nextItem.id, response.data.id);

    console.log(`✅ Posted tweet #${nextItem.id}`);
    console.log(`   Tweet ID: ${response.data.id}`);
    console.log(`   URL: ${getTweetUrl(response.data.id)}`);
    console.log(`   Text: "${response.data.text}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markFailed(nextItem.id, message);
    throw new Error(`Failed to post queue item #${nextItem.id}: ${message}`);
  }
}

function handleList(args: string[]): void {
  const allowedStatuses: QueueItemStatus[] = ["pending", "posted", "failed", "skipped"];
  const selectedStatus = allowedStatuses.find((status) => args.includes(`--${status}`));
  const items = loadQueue();
  const filteredItems = selectedStatus
    ? items.filter((item) => item.status === selectedStatus)
    : items;

  printQueue(filteredItems);
}

function handleAdd(args: string[]): void {
  const parsed = parseAddCommand(args);
  const item = addItem(parsed.item);

  console.log(`✅ Added ${item.type} #${item.id} to queue`);
  if (item.type === "thread") {
    console.log(`   Tweets: ${item.thread?.length ?? 0}`);
  }
  console.log(`   Text: "${item.type === "thread" ? item.thread?.[0] ?? item.text : item.text}"`);
  console.log(`   Status: ${item.status}`);
}

function handleSkip(args: string[]): void {
  const id = parseId(args[0], "skip");
  const item = markSkipped(id);
  console.log(`⏭️  Skipped queue item #${item.id}`);
}

function handleRetry(args: string[]): void {
  const id = parseId(args[0], "retry");
  const item = resetToPending(id);
  console.log(`🔁 Reset queue item #${item.id} to pending`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "--help" || command === "help") {
    printUsage();
    return;
  }

  switch (command) {
    case "post":
      await handlePost(args);
      return;
    case "list":
      handleList(args);
      return;
    case "add":
      handleAdd(args);
      return;
    case "skip":
      handleSkip(args);
      return;
    case "retry":
      handleRetry(args);
      return;
    default:
      exitWithError(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${message}`);
  process.exit(1);
});
