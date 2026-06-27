const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`,
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export const AUTH_LOGOUT_EVENT = "auth:logout";

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { [CSRF_HEADER]: readCookie(CSRF_COOKIE) ?? "" },
    })
      .then((res) => res.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!SAFE_METHODS.has(method)) {
    headers.set(CSRF_HEADER, readCookie(CSRF_COOKIE) ?? "");
  }

  const doFetch = () =>
    fetch(path, { ...init, method, headers, credentials: "include" });

  let res = await doFetch();

  if (
    res.status === 401 &&
    path !== "/api/auth/refresh" &&
    path !== "/api/auth/signin"
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }
  }

  return res;
}

export async function parseJsonOrThrow(
  res: Response,
  fallbackError: string,
): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? fallbackError);
  }
  return data;
}
