import { config } from "dotenv";
import { basename, resolve } from "node:path";

import { buildOAuthHeader } from "./auth.ts";
import { getProjectRoot } from "./queue.ts";
import type { PostTweetRequest, RateLimitInfo, TweetResponse, TwitterApiError } from "./types.ts";

config();

const TWEETS_URL = "https://api.x.com/2/tweets";
const MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const RATE_LIMIT_URL =
  "https://api.x.com/1.1/application/rate_limit_status.json?resources=statuses";

function getErrorDetail(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as {
      detail?: string;
      title?: string;
      errors?: TwitterApiError[];
    };

    if (candidate.detail) {
      return candidate.detail;
    }

    if (candidate.title) {
      return candidate.title;
    }

    const firstError = candidate.errors?.[0];
    if (firstError?.detail) {
      return firstError.detail;
    }

    if (firstError?.title) {
      return firstError.title;
    }
  }

  return JSON.stringify(payload);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function handleApiResponse<T>(response: Response, successStatus: number): Promise<T> {
  const payload = await parseResponseBody(response);

  if (response.status === successStatus) {
    return payload as T;
  }

  if (response.status === 429) {
    const reset = response.headers.get("x-rate-limit-reset");
    const resetTime = reset ? new Date(Number(reset) * 1000).toISOString() : "unknown";
    throw new Error(`Rate limited by X. Reset time: ${resetTime}`);
  }

  if (response.status === 403) {
    throw new Error(`Forbidden by X: ${getErrorDetail(payload)}`);
  }

  throw new Error(`X API error ${response.status}: ${getErrorDetail(payload)}`);
}

async function signedFetch(
  url: string,
  init: RequestInit,
  signatureParameters?: Record<string, string | number | boolean>,
): Promise<Response> {
  const method = init.method ?? "GET";
  const authorization = await buildOAuthHeader(method, url, signatureParameters);

  const headers = new Headers(init.headers);
  headers.set("Authorization", authorization);

  return fetch(url, {
    ...init,
    headers,
  });
}

export async function postTweet(
  text: string,
  replyToId?: string,
  mediaIds?: string[],
): Promise<TweetResponse> {
  const body: PostTweetRequest = {
    text,
    ...(replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : {}),
    ...(mediaIds && mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
  };

  const response = await signedFetch(TWEETS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return handleApiResponse<TweetResponse>(response, 201);
}

export async function postThread(tweets: string[]): Promise<TweetResponse[]> {
  if (tweets.length === 0) {
    throw new Error("Cannot post an empty thread.");
  }

  const responses: TweetResponse[] = [];
  let replyToId: string | undefined;

  for (const tweet of tweets) {
    const response = await postTweet(tweet, replyToId);
    responses.push(response);
    replyToId = response.data.id;
  }

  return responses;
}

export async function uploadMedia(filePath: string): Promise<string> {
  const projectRoot = getProjectRoot();
  const absolutePath = resolve(projectRoot, filePath);
  const file = Bun.file(absolutePath);

  const exists = await file.exists();
  if (!exists) {
    throw new Error(`Media file not found: ${filePath}`);
  }

  const form = new FormData();
  form.append("media", file, basename(absolutePath));

  const response = await signedFetch(MEDIA_UPLOAD_URL, {
    method: "POST",
    body: form,
  });

  const payload = await handleApiResponse<{ media_id_string?: string }>(response, 200);

  if (!payload.media_id_string) {
    throw new Error("X media upload succeeded but did not return media_id_string.");
  }

  return payload.media_id_string;
}

export async function checkRateLimits(): Promise<RateLimitInfo> {
  const response = await signedFetch(RATE_LIMIT_URL, { method: "GET" }, { resources: "statuses" });
  const payload = await handleApiResponse<{
    resources?: {
      statuses?: {
        "/statuses/update"?: {
          limit?: number;
          remaining?: number;
          reset?: number;
        };
      };
    };
  }>(response, 200);

  const info = payload.resources?.statuses?.["/statuses/update"];
  const reset = info?.reset ?? null;

  return {
    limit: info?.limit ?? null,
    remaining: info?.remaining ?? null,
    reset,
    resetAt: reset ? new Date(reset * 1000).toISOString() : null,
  };
}
