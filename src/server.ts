import "dotenv/config";
import { join } from "node:path";

import { checkRateLimits, postThread, postTweet, uploadMedia } from "./api.ts";
import {
  addItem,
  deleteItem as deleteQueueItem,
  getDueScheduledItems,
  getNextPending,
  getScheduledItems,
  loadQueue,
  markFailed,
  markPosted,
  markSkipped,
  reorderItems,
  resetToPending,
  getQueueStats,
  updateItemScheduledAt,
  updateItemText,
} from "./queue.ts";
import { createSession, getSession, deleteSession } from "./sessions.ts";
import { getUser, verifyUser } from "./users.ts";
import type { AddQueueItemInput, QueueItemStatus } from "./types.ts";

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
  "Access-Control-Allow-Origin": "http://localhost:3001",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const SESSION_COOKIE = "session_id";

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

function getUsernameFromRequest(request: Request): string | null {
  const sessionId = request.headers.get("Cookie")?.split(";")
    .find(c => c.trim().startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (!sessionId) return null;

  const session = getSession(sessionId);
  return session?.username ?? null;
}

function requireAuth(request: Request): string {
  const username = getUsernameFromRequest(request);
  if (!username) {
    throw new Error("Unauthorized");
  }
  return username;
}

function validateAddItem(body: unknown): { item: AddQueueItemInput } | string {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const { type, text, thread, media, scheduled_at } = body;

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

  if (scheduled_at !== undefined && scheduled_at !== null) {
    if (typeof scheduled_at !== "string") {
      return "scheduled_at must be an ISO date string or null.";
    }
    const date = new Date(scheduled_at);
    if (isNaN(date.getTime())) {
      return "scheduled_at must be a valid ISO date string.";
    }
  }

  return {
    item: {
      type: type as "tweet" | "thread",
      text: text as string,
      ...(Array.isArray(thread) ? { thread: thread as string[] } : {}),
      ...(Array.isArray(media) && media.length > 0 ? { media: media as string[] } : {}),
      ...(scheduled_at ? { scheduled_at: scheduled_at as string } : {}),
    },
  };
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  if (path === "/api/auth/login" && method === "POST") {
    return withCors(await handleLogin(request));
  }

  if (path === "/api/auth/logout" && method === "POST") {
    return withCors(await handleLogout(request));
  }

  if (path === "/api/auth/me" && method === "GET") {
    return withCors(await handleMe(request));
  }

  if (path === "/api/auth/register" && method === "POST") {
    return withCors(await handleRegister(request));
  }

  if (path === "/api/auth/twitter" && method === "POST") {
    return withCors(await handleSetTwitter(request));
  }

  if (path === "/api/auth/twitter" && method === "GET") {
    return withCors(await handleGetTwitter(request));
  }

  if (path.startsWith("/api/")) {
    try {
      return withCors(await handleApiRoute(method, path, url, request));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "Unauthorized") {
        return withCors(err("Unauthorized", 401));
      }
      return withCors(err(message, 500));
    }
  }

  return withCors(await serveStaticFile(path));
}

async function handleLogin(request: Request): Promise<Response> {
  const body = await readBody(request);
  if (!isRecord(body) || typeof body.username !== "string" || typeof body.password !== "string") {
    return err("Invalid login request");
  }

  const user = getUser(body.username);
  if (!user || !verifyUser(body.username, body.password)) {
    return err("Invalid username or password", 401);
  }

  const session = createSession(body.username);
  const cookieHeader = `${SESSION_COOKIE}=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;

  return new Response(JSON.stringify({ success: true, data: { username: user.username } }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
}

async function handleLogout(request: Request): Promise<Response> {
  const sessionId = request.headers.get("Cookie")?.split(";")
    .find(c => c.trim().startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (sessionId) {
    deleteSession(sessionId);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}

async function handleMe(request: Request): Promise<Response> {
  const username = getUsernameFromRequest(request);
  if (!username) {
    return err("Not authenticated", 401);
  }
  return ok({ username, hasTwitter: !!getUser(username)?.twitter });
}

async function handleRegister(request: Request): Promise<Response> {
  const body = await readBody(request);
  if (!isRecord(body) || typeof body.username !== "string" || typeof body.password !== "string") {
    return err("Invalid registration request");
  }

  const { username, password } = body;
  if (username.length < 3) return err("Username must be at least 3 characters");
  if (password.length < 6) return err("Password must be at least 6 characters");

  const { createUser } = await import("./users.ts");
  try {
    const { hashPassword } = await import("./users.ts");
    createUser(username, hashPassword(password));
    return ok({ username }, 201);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Registration failed", 400);
  }
}

async function handleSetTwitter(request: Request): Promise<Response> {
  const username = requireAuth(request);
  const body = await readBody(request);
  if (!isRecord(body)) return err("Invalid request");

  const consumerKey = body.consumerKey;
  const consumerSecret = body.consumerSecret;
  const accessToken = body.accessToken;
  const accessTokenSecret = body.accessTokenSecret;

  if (
    typeof consumerKey !== "string" ||
    typeof consumerSecret !== "string" ||
    typeof accessToken !== "string" ||
    typeof accessTokenSecret !== "string"
  ) {
    return err("Missing Twitter credentials");
  }

  const { updateUserTwitter } = await import("./users.ts");
  updateUserTwitter(username, { consumerKey, consumerSecret, accessToken, accessTokenSecret });
  return ok({ success: true });
}

async function handleGetTwitter(request: Request): Promise<Response> {
  const username = requireAuth(request);
  const user = getUser(username);
  if (!user?.twitter) return ok({ configured: false });
  return ok({
    configured: true,
    consumerKey: user.twitter.consumerKey.slice(0, 4) + "...",
    accessToken: user.twitter.accessToken.slice(0, 4) + "...",
  });
}

async function handleApiRoute(
  method: string,
  path: string,
  url: URL,
  request: Request,
): Promise<Response> {
  const username = requireAuth(request);

  if (method === "GET" && path === "/api/queue") {
    const user = getUser(username);
    let items = loadQueue(username);

    // Lazy scheduler: post any scheduled items that are due
    if (user?.twitter) {
      const dueItems = getDueScheduledItems(username);
      for (const item of dueItems) {
        try {
          if (item.type === "thread") {
            const responses = await postThread(item.thread ?? [], user.twitter);
            const threadIds = responses.map((r) => r.data.id);
            markPosted(username, item.id, threadIds[0] ?? "", threadIds);
          } else {
            const mediaIds = item.media
              ? await Promise.all(item.media.map((fp) => uploadMedia(fp, user.twitter!)))
              : [];
            const response = await postTweet(item.text, user.twitter, undefined, mediaIds);
            markPosted(username, item.id, response.data.id);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          markFailed(username, item.id, message);
        }
      }
      // Reload after posting
      items = loadQueue(username);
    }

    const status = url.searchParams.get("status") as QueueItemStatus | null;

    if (status) {
      const validStatuses: QueueItemStatus[] = ["pending", "posted", "failed", "skipped"];
      if (!validStatuses.includes(status)) {
        return err(`Invalid status filter: ${status}. Use: pending, posted, failed, skipped.`);
      }
      items = items.filter((item) => item.status === status);
    }

    return ok(items);
  }

  if (method === "GET" && path === "/api/queue/stats") {
    const stats = getQueueStats(username);
    return ok(stats);
  }

  if (method === "POST" && path === "/api/queue") {
    const body = await readBody(request);
    const result = validateAddItem(body);

    if (typeof result === "string") {
      return err(result);
    }

    const item = addItem(username, result.item);
    return ok(item, 201);
  }

  if (method === "POST" && path === "/api/queue/post") {
    const user = getUser(username);
    if (!user?.twitter) {
      return err("Twitter credentials not configured. Set them in account settings.", 400);
    }

    const nextItem = getNextPending(username);
    if (!nextItem) {
      return err("No pending items in queue.", 404);
    }

    try {
      try {
        const rateLimit = await checkRateLimits(user.twitter);
        if (rateLimit.remaining !== null) {
          console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit ?? "?"} posts remaining`);
        }
      } catch {}

      if (nextItem.type === "thread") {
        const threadTexts = nextItem.thread ?? [];
        if (threadTexts.length === 0) {
          return err(`Thread #${nextItem.id} has no tweets.`);
        }
        const responses = await postThread(threadTexts, user.twitter);
        const threadIds = responses.map((r) => r.data.id);
        const firstId = threadIds[0] ?? "";
        markPosted(username, nextItem.id, firstId, threadIds);

        return ok({
          id: nextItem.id,
          type: "thread",
          tweet_ids: threadIds,
          urls: threadIds.map((tid) => `https://x.com/CjRamirez333/status/${tid}`),
          posted_at: new Date().toISOString(),
        });
      }

      const mediaIds = nextItem.media
        ? await Promise.all(nextItem.media.map((fp) => uploadMedia(fp, user.twitter!)))
        : [];

      const response = await postTweet(nextItem.text, user.twitter, undefined, mediaIds);
      markPosted(username, nextItem.id, response.data.id);

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
      markFailed(username, nextItem.id, message);
      return err(`Failed to post #${nextItem.id}: ${message}`, 500);
    }
  }

  if (method === "POST" && path === "/api/queue/post/dry-run") {
    const nextItem = getNextPending(username);
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

  const skipMatch = path.match(/^\/api\/queue\/(\d+)\/skip$/);
  if (method === "POST" && skipMatch) {
    const id = Number(skipMatch[1]);
    try {
      const item = markSkipped(username, id);
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  const retryMatch = path.match(/^\/api\/queue\/(\d+)\/retry$/);
  if (method === "POST" && retryMatch) {
    const id = Number(retryMatch[1]);
    try {
      const item = resetToPending(username, id);
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  const deleteMatch = path.match(/^\/api\/queue\/(\d+)$/);
  if (method === "DELETE" && deleteMatch) {
    const id = Number(deleteMatch[1]);
    try {
      const deleted = deleteQueueItem(username, id);
      return ok(deleted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 404);
    }
  }

  if (method === "PATCH" && path === "/api/queue/reorder") {
    const body = await readBody(request);
    if (!isRecord(body) || !Array.isArray(body.ordered_ids)) {
      return err("Request body must contain { ordered_ids: number[] }");
    }
    try {
      const reordered = reorderItems(username, body.ordered_ids as number[]);
      return ok(reordered);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 400);
    }
  }

  // PATCH /api/queue/:id (update text/thread/schedule)
  const updateMatch = path.match(/^\/api\/queue\/(\d+)$/);
  if (method === "PATCH" && updateMatch) {
    const id = Number(updateMatch[1]);
    const body = await readBody(request);
    if (!isRecord(body)) return err("Invalid request");
    const text = body.text;
    const thread = body.thread;
    const scheduledAt = body.scheduled_at;
    if (typeof text !== "string" && !Array.isArray(thread) && scheduledAt === undefined) {
      return err("Must provide text (string), thread (string[]), or scheduled_at");
    }
    try {
      const item = updateItemText(
        username,
        id,
        typeof text === "string" ? text : undefined,
        Array.isArray(thread) ? thread as string[] : undefined,
        typeof scheduledAt === "string" || scheduledAt === null ? scheduledAt : undefined,
      );
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 400);
    }
  }

  // PATCH /api/queue/:id/schedule
  const scheduleMatch = path.match(/^\/api\/queue\/(\d+)\/schedule$/);
  if (method === "PATCH" && scheduleMatch) {
    const id = Number(scheduleMatch[1]);
    const body = await readBody(request);
    if (!isRecord(body)) return err("Invalid request");
    const scheduledAt = body.scheduled_at;
    if (typeof scheduledAt !== "string" && scheduledAt !== null) {
      return err("scheduled_at must be ISO date string or null");
    }
    try {
      const item = updateItemScheduledAt(username, id, scheduledAt);
      return ok(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 400);
    }
  }

  // GET /api/queue/scheduled?start=ISO&end=ISO
  if (method === "GET" && path === "/api/queue/scheduled") {
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) {
      return err("Missing start or end query params");
    }
    try {
      const items = getScheduledItems(username, new Date(start), new Date(end));
      return ok(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(message, 400);
    }
  }

  return err("Not found.", 404);
}

async function serveStaticFile(path: string): Promise<Response> {
  const frontendDist = join(import.meta.dir, "..", "frontend-dist");

  if (path !== "/") {
    const filePath = join(frontendDist, path);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  const indexPath = join(frontendDist, "index.html");
  const indexFile = Bun.file(indexPath);
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    JSON.stringify({
      service: "x-poster",
      version: "1.0.0",
      endpoints: ["/api/auth/login", "/api/auth/logout", "/api/auth/me"],
    }, null, 2),
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
