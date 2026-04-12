export interface QueueItem {
  id: number;
  type: "tweet" | "thread";
  status: "pending" | "posted" | "failed" | "skipped";
  text: string;
  thread?: string[];
  media?: string[];
  posted_at?: string;
  tweet_id?: string;
  thread_ids?: string[];
  error?: string;
  created_at: string;
  scheduled_at?: string;
}

export interface QueueStats {
  pending: number;
  posted: number;
  failed: number;
  skipped: number;
  scheduled: number;
}

export interface AddTweetInput {
  type: "tweet";
  text: string;
  media?: string[];
  scheduled_at?: string;
}

export interface AddThreadInput {
  type: "thread";
  text: string;
  thread: string[];
  media?: string[];
  scheduled_at?: string;
}

export interface PostResult {
  success: boolean;
  data?: QueueItem;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
