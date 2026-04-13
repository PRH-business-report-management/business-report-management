import { bearerFromRequest } from "@/lib/graph/client";
import { listDirectoryUsers } from "@/lib/graph/directoryUsers";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";

/** Entra ID のユーザー一覧（提出先・指示書の相手先など）。認証済みなら誰でも取得可。 */
export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getEffectiveUser(req, token);
    const dir = await listDirectoryUsers(token).catch(() => [] as const);
    const items = dir
      .map((d) => ({
        id: d.id,
        displayName: d.displayName || "",
        email: d.mail || d.userPrincipalName || "",
      }))
      .sort((a, b) =>
        (a.displayName || a.email).localeCompare(b.displayName || b.email, "ja")
      );
    return Response.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
