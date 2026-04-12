import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Session } from "./types.ts";

const PROJECT_ROOT = resolve(new URL("..", import.meta.url).pathname);
const SESSIONS_PATH = join(PROJECT_ROOT, "content", "sessions.json");

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadSessions(): Session[] {
  if (!existsSync(SESSIONS_PATH)) return [];
  const raw = readFileSync(SESSIONS_PATH, "utf8").trim();
  if (raw.length === 0) return [];
  return JSON.parse(raw) as Session[];
}

function saveSessions(sessions: Session[]): void {
  writeFileSync(SESSIONS_PATH, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
}

export function createSession(username: string): Session {
  const sessions = loadSessions().filter(s => s.username === username);
  
  const session: Session = {
    id: crypto.randomUUID(),
    username,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
  
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(sessionId);
    return null;
  }
  
  return session;
}

export function deleteSession(sessionId: string): void {
  const sessions = loadSessions().filter(s => s.id !== sessionId);
  saveSessions(sessions);
}

export function deleteUserSessions(username: string): void {
  const sessions = loadSessions().filter(s => s.username !== username);
  saveSessions(sessions);
}

export function cleanExpiredSessions(): void {
  const now = new Date();
  const sessions = loadSessions().filter(s => new Date(s.expiresAt) > now);
  saveSessions(sessions);
}
