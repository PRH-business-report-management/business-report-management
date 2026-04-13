import { bearerFromRequest, graphRequest } from "@/lib/graph/client";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import {
  getListIdDailyReports,
  getListIdWorkInstructions,
  getSharePointSiteId,
} from "@/lib/graph/env";

type StepResult = { ok: boolean; detail?: string };

/**
 * SharePoint（Graph）接続の簡易診断。サインイン済みクライアントから Authorization: Bearer で呼び出す。
 * サイトの参照と各リストの 1 件取得を試します。
 */
export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = token;

  try {
    await getEffectiveUser(req, accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Session error";
    return Response.json({ error: msg }, { status: 500 });
  }

  try {
    const siteId = getSharePointSiteId();
    const dailyListId = getListIdDailyReports();
    const instrListId = getListIdWorkInstructions();

    const steps: Record<string, StepResult> = {};

    try {
      await graphRequest<{ displayName?: string; id?: string }>(
        accessToken,
        `/sites/${encodeURIComponent(siteId)}?$select=id,displayName,webUrl`
      );
      steps.site = { ok: true };
    } catch (e) {
      steps.site = {
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    async function probeList(key: string, listId: string) {
      try {
        await graphRequest(
          accessToken,
          `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?$top=1&expand=fields`
        );
        steps[key] = { ok: true };
      } catch (e) {
        steps[key] = {
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        };
      }
    }

    await probeList("listDailyReports", dailyListId);
    await probeList("listWorkInstructions", instrListId);

    const allOk = Object.values(steps).every((s) => s.ok);
    return Response.json({
      allOk,
      steps,
      hint:
        "403/404 のときはサイト ID・リスト GUID、および Azure AD で Sites.ReadWrite.All の管理者同意を確認してください。列エラーは env.example の SHAREPOINT_*_FIELD_* を参照してください。",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
