import { apiFetch, parseJsonOrThrow } from "./http";

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export async function signUp(
  email: string,
  password: string,
): Promise<PublicUser> {
  const res = await apiFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonOrThrow(res, "Could not create account.");
  return data.user;
}

export async function signIn(
  email: string,
  password: string,
): Promise<PublicUser> {
  const res = await apiFetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonOrThrow(res, "Invalid email or password.");
  return data.user;
}

export async function signOut(): Promise<void> {
  await apiFetch("/api/auth/signout", { method: "POST" });
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  const data = await parseJsonOrThrow(res, "Failed to load session.");
  return data.user;
}
