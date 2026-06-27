import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { authDb } from "./auth-db.js";

const BCRYPT_COST = 12;
const UNIQUE_VIOLATION = "23505";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await authDb.query("SELECT * FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await authDb.query("SELECT * FROM users WHERE id = $1", [id]);
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

export async function createUser(
  email: string,
  password: string,
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user: User = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  try {
    await authDb.query(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)",
      [user.id, user.email, user.passwordHash, user.createdAt],
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("An account with this email already exists.");
    }
    throw err;
  }

  return user;
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(
    err &&
    typeof err === "object" &&
    "code" in err &&
    err.code === UNIQUE_VIOLATION,
  );
}

export async function verifyPassword(
  user: User,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}
