import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { authDb } from "./auth-db.js";

function requireEnv(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set. Generate a strong random value (e.g. ` +
        "`openssl rand -base64 48`) and set it in server/.env — the server " +
        "refuses to start without it.",
    );
  }
  return value;
}

const ACCESS_SECRET: string = requireEnv("JWT_ACCESS_SECRET");
const REFRESH_SECRET: string = requireEnv("JWT_REFRESH_SECRET");

if (ACCESS_SECRET === REFRESH_SECRET) {
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.",
  );
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AccessTokenPayload {
  sub: string;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid access token payload.");
  }
  return { sub: decoded.sub };
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await authDb.query(
    "INSERT INTO refresh_tokens (id, user_id, expires_at, revoked_at, created_at) VALUES ($1, $2, $3, NULL, $4)",
    [jti, userId, expiresAt.toISOString(), now.toISOString()],
  );

  return jwt.sign({ sub: userId, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export class RefreshTokenReuseError extends Error {
  constructor(public readonly userId: string) {
    super("Refresh token reuse detected.");
  }
}

export async function rotateRefreshToken(
  token: string,
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  let payload: RefreshTokenPayload;
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (typeof decoded === "string" || !decoded.sub || !decoded.jti) {
      throw new Error("Invalid refresh token payload.");
    }
    payload = { sub: decoded.sub, jti: decoded.jti };
  } catch {
    throw new Error("Invalid or expired refresh token.");
  }

  const result = await authDb.query(
    "SELECT user_id, expires_at, revoked_at FROM refresh_tokens WHERE id = $1",
    [payload.jti],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || row.user_id !== payload.sub) {
    throw new Error("Invalid or expired refresh token.");
  }
  if (row.revoked_at) {
    await revokeAllUserRefreshTokens(payload.sub);
    throw new RefreshTokenReuseError(payload.sub);
  }
  if (new Date(row.expires_at as string | Date).getTime() < Date.now()) {
    throw new Error("Invalid or expired refresh token.");
  }

  await revokeRefreshToken(payload.jti);

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccessToken(payload.sub)),
    issueRefreshToken(payload.sub),
  ]);

  return { userId: payload.sub, accessToken, refreshToken };
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await authDb.query(
    "UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL",
    [new Date().toISOString(), jti],
  );
}

export async function revokeAllUserRefreshTokens(
  userId: string,
): Promise<void> {
  await authDb.query(
    "UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL",
    [new Date().toISOString(), userId],
  );
}

export function decodeRefreshTokenJti(token: string): string | null {
  try {
    const decoded = jwt.decode(token);
    if (
      decoded &&
      typeof decoded !== "string" &&
      typeof decoded.jti === "string"
    ) {
      return decoded.jti;
    }
    return null;
  } catch {
    return null;
  }
}
