import { QueueItem, QueueStats, AddTweetInput, AddThreadInput, PostResult, ApiResponse } from './types';

const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  const data = await response.json() as ApiResponse<T>;
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data as T;
}

export async function login(username: string, password: string): Promise<{ username: string }> {
  return fetchApi<{ username: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await fetchApi<void>('/auth/logout', { method: 'POST' });
}

export async function register(username: string, password: string): Promise<{ username: string }> {
  return fetchApi<{ username: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<{ username: string; hasTwitter: boolean }> {
  return fetchApi<{ username: string; hasTwitter: boolean }>('/auth/me');
}

export interface TwitterCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface TwitterStatus {
  configured: boolean;
  consumerKey?: string;
  accessToken?: string;
}

export async function setTwitter(credentials: TwitterCredentials): Promise<void> {
  await fetchApi<void>('/auth/twitter', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getTwitter(): Promise<TwitterStatus> {
  return fetchApi<TwitterStatus>('/auth/twitter');
}

export async function fetchQueue(status?: string): Promise<QueueItem[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return fetchApi<QueueItem[]>(`/queue${query}`);
}

export async function fetchStats(): Promise<QueueStats> {
  return fetchApi<QueueStats>('/queue/stats');
}

export async function addTweet(data: AddTweetInput): Promise<QueueItem> {
  return fetchApi<QueueItem>('/queue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addThread(data: AddThreadInput): Promise<QueueItem> {
  return fetchApi<QueueItem>('/queue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function postNext(): Promise<PostResult> {
  try {
    const data = await fetchApi<QueueItem>('/queue/post', { method: 'POST' });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dryRunNext(): Promise<PostResult> {
  try {
    const data = await fetchApi<QueueItem>('/queue/post/dry-run', { method: 'POST' });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function skipItem(id: number): Promise<QueueItem> {
  return fetchApi<QueueItem>(`/queue/${id}/skip`, { method: 'POST' });
}

export async function retryItem(id: number): Promise<QueueItem> {
  return fetchApi<QueueItem>(`/queue/${id}/retry`, { method: 'POST' });
}

export async function deleteItem(id: number): Promise<void> {
  return fetchApi<void>(`/queue/${id}`, { method: 'DELETE' });
}

export async function reorderItems(orderedIds: number[]): Promise<QueueItem[]> {
  return fetchApi<QueueItem[]>('/queue/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}

export async function scheduleItem(id: number, scheduledAt: string | null): Promise<QueueItem> {
  return fetchApi<QueueItem>(`/queue/${id}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
}

export async function fetchScheduledItems(start: Date, end: Date): Promise<QueueItem[]> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  return fetchApi<QueueItem[]>(`/queue/scheduled?start=${startStr}&end=${endStr}`);
}
