import { config } from "dotenv";
import { join } from "node:path";

import { checkRateLimits, postThread, postTweet, uploadMedia } from "./api.ts";
import {
  addItem,
  deleteItem as deleteQueueItem,
  getNextPending,
  loadQueue,
  markFailed,
  markPosted,
  markSkipped,
  resetToPending,
} from "./queue.ts";
import type { AddQueueItemInput, QueueItemStatus } from "./types.ts";

config();

const PORT = Number(process.env.PORT) || 3001;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } as ApiResponse<T>, { status });
}

function err(message: string, status = 400): Response {
  return Response.json({ success: false, error: message } as ApiResponse<never>, { status });
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateAddItem(body: unknown): { item: AddQueueItemInput } | string {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const { type, text, thread, media } = body;

  if (type !== "tweet" && type !== "thread") {
    return "type must be 'tweet' or 'thread'.";
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return "text is required and must be non-empty.";
  }

  if (type === "tweet" && text.length > 280) {
    return `Tweet text exceeds 280 characters (${text.length}/280).`;
  }

  if (type === "thread") {
    if (!Array.isArray(thread) || thread.length < 2) {
      return "thread must be an array with at least 2 entries.";
    }

    for (const [index, entry] of thread.entries()) {
      if (typeof entry !== "string" || entry.trim().length === 0) {
        return `thread[${index}] must be a non-empty string.`;
      }

      if (entry.length > 280) {
        return `thread[${index}] exceeds 280 characters (${entry.length}/280).`;
      }
    }
  }

  if (media !== undefined) {
    if (!Array.isArray(media)) {
      return "media must be an array of file paths.";
    }

    if (type === "thread") {
      return "media is not supported for thread items.";
    }
  }

  return {
    item: {
      type: type as "tweet" | "thread",
      text: text as string,
      ...(Array.isArray(thread) ? { thread: thread as string[] } : {}),
      ...(Array.isArray(media) && media.length > 0 ? { media: media as string[] } : {}),
    },
  };
}

interface QueueStats {
  pending: number;
  posted: number;
  failed: number;
  skipped: number;
  total: number;
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  // API routes
  if (path.startsWith("/api/queue")) {
    try {
      return withCors(await handleApiRoute(method, path, url, request));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return withCors(err(message, 500));
    }
  }

  // Static file serving for SPA
  return withCors(await serveStaticFile(path));
}

async function handleApiRoute(
  method: string,
  path: string,
  url: URL,
  request: Request,
): Promise<Response> {
  // GET /api/queue — list all, optionally filter by status
  if (method === "GET" && path === "/api/queue") {
    const status = url.searchParams.get("status") as QueueItemStatus | null;
    let items = loadQueue();

    if (status) {
      const validStatuses: QueueItemStatus[] = ["pending", "posted", "failed", "skipped"];
      if (!validStatuses.includes(status)) {
        return err(`Invalid status filter: ${status}. Use: pending, posted, failed, skipped.`);
      }
      items = items.filter((item) => item.status === status);
    }

    return ok(items);
  }

  // GET /api/queue/stats
  if (method === "GET" && path === "/api/queue/stats") {
    const items = loadQueue();
    const stats: QueueStats = {
      pending: items.filter((i) => i.status === "pending").length,
      posted: items.filter((i) => i.status === "posted").length,
      failed: items.filter((i) => i.status === "failed").length,
      skipped: items.filter((i) => i.status === "skipped").length,
      total: items.length,
    };
    return ok(stats);
  }

  // POST /api/queue — add item
  if (method === "POST" && path === "/api/queue") {
    const body = await readBody(request);
    const result = validateAddItem(body);

    if (typeof result === "string") {
      return err(result);
    }

    const item = addItem(result.item);
    return ok(item, 201);
  }

  // POST /api/queue/post — post next pending
  if (method === "POST" && path === "/api/queue/post") {
    const nextItem = getNextPending();
    if (!nextItem) {
      return err("No pending items in queue.", 404);
    }

    try {
      // Check rate limits (non-fatal)
      try {
        const rateLimit = await checkRateLimits();
        if (rateLimit.remaining !== null) {
          console.log(
            `Rate limit: ${rateLimit.remaining}/${rateLimit.limit ?? "?"} posts remaining`,
          );
        }
      } catch {
        // Non-fatal — continue posting
      }

      if (nextItem.type === "thread") {
        const threadTexts = nextItem.thread ?? [];
        if (threadTexts.length === 0) {
          return err(`Thread #${nextItem.id} has no tweets.`);
        }
        const responses = await postThread(threadTexts);
        const threadIds = responses.map((r) => r.data.id);
        const firstId = threadIds[0] ?? "";
        markPosted(nextItem.id, firstId, threadIds);

        return ok({
          id: nextItem.id,
          type: "thread",
          tweet_ids: threadIds,
          urls: threadIds.map((tid) => `https://x.com/CjRamirez333/status/${tid}`),
          posted_at: new Date().toISOString(),
        });
      }

      // Single tweet (with optional media)
      const mediaIds = nextItem.media
        ? await Promise.all(nextItem.media.map((fp) => uploadMedia(fp)))
        : [];

      const response = await postTweet(nextItem.text, undefined, mediaIds);
      markPosted(nextItem.id, response.data.id);

      return ok({
        id: nextItem.id,
        type: "tweet",
        tweet_id: response.data.id,
        url: `https://x.com/CjRamirez333/status/${response.data.id}`,
        text: response.data.text,
        posted_at: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markFailed(nextItem.id, message);
      return err(`Failed to post #${nextItem.id}: ${message}`, 500);
    }
  }

  // POST /api/queue/post/dry-run
  if (method === "POST" && path === "/api/queue/post/dry-run") {
    const nextItem = getNextPending();
    if (!nextItem) {
      return err("No pending items in queue.", 404);
    }

    return ok({
      id: nextItem.id,
      type: nextItem.type,
      text: nextItem.text,
      thread: nextItem.thread,
      media: nextItem.media,
      preview: nextItem.type === "thread"
        ? `Thread of ${nextItem.thread?.length ?? 0} tweets`
        : `Single tweet (${nextItem.text.length}/280 chars)`,
    });
  }

  // POST /api/queue/:id/skip
  const skipMatch = path.match(/^\/api\/queue\/(\d+)\/skip$/);
  if (method === "POST" && skipMatch) {
    const id = Number(skipMatch[1]);
    try {
      const item = markSkipped(id);
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  // POST /api/queue/:id/retry
  const retryMatch = path.match(/^\/api\/queue\/(\d+)\/retry$/);
  if (method === "POST" && retryMatch) {
    const id = Number(retryMatch[1]);
    try {
      const item = resetToPending(id);
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  // DELETE /api/queue/:id
  const deleteMatch = path.match(/^\/api\/queue\/(\d+)$/);
  if (method === "DELETE" && deleteMatch) {
    const id = Number(deleteMatch[1]);
    try {
      const deleted = deleteQueueItem(id);
      return ok(deleted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  return err("Not found.", 404);
}

async function serveStaticFile(path: string): Promise<Response> {
  const frontendDist = join(import.meta.dir, "..", "frontend-dist");

  // Try exact path first (for JS, CSS, images, etc.)
  if (path !== "/") {
    const filePath = join(frontendDist, path);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  // Fallback to index.html for SPA routing
  const indexPath = join(frontendDist, "index.html");
  const indexFile = Bun.file(indexPath);
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // No frontend built yet — return API info
  return new Response(
    JSON.stringify(
      {
        service: "x-poster",
        version: "1.0.0",
        endpoints: [
          "GET    /api/queue              — List queue items",
          "GET    /api/queue/stats        — Queue stats",
          "POST   /api/queue              — Add tweet or thread",
          "POST   /api/queue/post         — Post next pending",
          "POST   /api/queue/post/dry-run — Dry-run next pending",
          "POST   /api/queue/:id/skip     — Skip item",
          "POST   /api/queue/:id/retry    — Retry failed item",
          "DELETE /api/queue/:id           — Delete item",
        ],
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json" } },
  );
}

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`🚀 x-poster server running at http://localhost:${server.port}`);
console.log(`   API:  http://localhost:${server.port}/api/queue`);
console.log(`   Web:  http://localhost:${server.port}/`);