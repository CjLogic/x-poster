export type QueueItemType = "tweet" | "thread";
export type QueueItemStatus = "pending" | "posted" | "failed" | "skipped";

export interface QueueItem {
  id: number;
  type: QueueItemType;
  status: QueueItemStatus;
  text: string;
  thread?: string[];
  media?: string[];
  posted_at?: string;
  tweet_id?: string;
  thread_ids?: string[];
  error?: string;
  created_at: string;
}

export interface TweetResponse {
  data: {
    id: string;
    text: string;
  };
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
  resetAt: string | null;
}

export interface TwitterApiError {
  title?: string;
  detail?: string;
  type?: string;
}

export interface OAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface PostTweetRequest {
  text: string;
  reply?: {
    in_reply_to_tweet_id: string;
  };
  media?: {
    media_ids: string[];
  };
}

export interface AddQueueItemInput {
  type: QueueItemType;
  text: string;
  thread?: string[];
  media?: string[];
}
