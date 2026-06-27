import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const isProduction = process.env.NODE_ENV === "production";

export function ensureCsrfCookie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = randomBytes(32).toString("base64url");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
  }
  next();
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF token missing or invalid." });
  }
  next();
}
