const GRAPH = "https://graph.microsoft.com/v1.0";

export async function graphRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Graph ${init?.method ?? "GET"} ${path}: ${res.status} ${text}`
    );
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function bearerFromRequest(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}
