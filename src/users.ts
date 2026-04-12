import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { User } from "./types.ts";

const PROJECT_ROOT = resolve(new URL("..", import.meta.url).pathname);
const USERS_PATH = join(PROJECT_ROOT, "content", "users.json");

function ensureUsersFile(): void {
  mkdirSync(dirname(USERS_PATH), { recursive: true });
  if (!existsSync(USERS_PATH)) {
    writeFileSync(USERS_PATH, "[]\n", "utf8");
  }
}

export function loadUsers(): User[] {
  ensureUsersFile();
  const raw = readFileSync(USERS_PATH, "utf8").trim();
  if (raw.length === 0) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("users.json must be an array");
  return parsed as User[];
}

export function saveUsers(users: User[]): void {
  ensureUsersFile();
  writeFileSync(USERS_PATH, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

export function getUser(username: string): User | undefined {
  return loadUsers().find(u => u.username === username);
}

export function createUser(username: string, passwordHash: string): User {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    throw new Error(`User "${username}" already exists`);
  }
  const user: User = {
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUserTwitter(username: string, twitter: User["twitter"]): User {
  const users = loadUsers();
  const index = users.findIndex(u => u.username === username);
  if (index === -1) throw new Error(`User "${username}" not found`);
  if (twitter) {
    users[index]!.twitter = twitter;
  }
  saveUsers(users);
  return users[index]!;
}

export function verifyUser(username: string, passwordHash: string): boolean {
  const user = getUser(username);
  if (!user) return false;
  return Bun.password.verifySync(passwordHash, user.passwordHash);
}

export function hashPassword(password: string): string {
  return Bun.password.hashSync(password);
}
