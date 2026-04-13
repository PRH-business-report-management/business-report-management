import { bearerFromRequest } from "@/lib/graph/client";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";

export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const u = await getEffectiveUser(req, token);
    return Response.json({
      user: {
        id: u.id,
        displayName: u.displayName,
        email: u.email,
      },
      ...(u.isImpersonating
        ? {
            dev: {
              impersonating: true as const,
              actualUserId: u.actualAzureAdId,
              actualDisplayName: u.actualDisplayName ?? "",
            },
          }
        : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Session error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
