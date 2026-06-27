import type { NextFunction, Request, Response } from "express";
import { ACCESS_COOKIE } from "../lib/auth-cookies.js";
import { verifyAccessToken } from "../lib/tokens.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const { sub } = verifyAccessToken(token);
    req.userId = sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired." });
  }
}
