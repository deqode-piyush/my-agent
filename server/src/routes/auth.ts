import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} from "../lib/auth-cookies.js";
import {
  decodeRefreshTokenJti,
  issueRefreshToken,
  revokeRefreshToken,
  RefreshTokenReuseError,
  rotateRefreshToken,
  signAccessToken,
} from "../lib/tokens.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  toPublicUser,
  verifyPassword,
} from "../lib/users.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

router.post("/signup", authLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  }

  try {
    const user = await createUser(parsed.data.email, parsed.data.password);
    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(409).json({
      error: err instanceof Error ? err.message : "Could not create account.",
    });
  }
});

router.post("/signin", authLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  }

  const invalidCredentials = () =>
    res.status(401).json({ error: "Invalid email or password." });

  const user = await findUserByEmail(parsed.data.email);
  if (!user) return invalidCredentials();

  const valid = await verifyPassword(user, parsed.data.password);
  if (!valid) return invalidCredentials();

  const accessToken = signAccessToken(user.id);
  const refreshToken = await issueRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user: toPublicUser(user) });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(token);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(204).send();
  } catch (err) {
    clearAuthCookies(res);
    if (err instanceof RefreshTokenReuseError) {
      console.warn(`Refresh token reuse detected for user ${err.userId}.`);
    }
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
});

router.post("/signout", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  const jti = token ? decodeRefreshTokenJti(token) : null;
  if (jti) {
    await revokeRefreshToken(jti);
  }
  clearAuthCookies(res);
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.userId!);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  res.json({ user: toPublicUser(user) });
});

export default router;
