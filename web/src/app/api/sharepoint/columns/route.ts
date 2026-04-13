import { bearerFromRequest } from "@/lib/graph/client";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import {
  buildDailyReportFieldEnvLines,
  buildWorkInstructionFieldEnvLines,
  fetchListColumns,
} from "@/lib/graph/listColumns";
import {
  getListIdDailyReports,
  getListIdWorkInstructions,
  getSharePointSiteId,
} from "@/lib/graph/env";

/**
 * SharePoint リストの列（内部名 name / 表示名 displayName）を Graph で取得。
 * list=daily | instructions。表示名がアプリ既定と一致する列について .env 用の行も返す。
 */
export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getEffectiveUser(req, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Session error";
    return Response.json({ error: msg }, { status: 500 });
  }

  const url = new URL(req.url);
  const which = url.searchParams.get("list") === "instructions" ? "instructions" : "daily";
  const siteId = getSharePointSiteId();
  const listId =
    which === "instructions"
      ? getListIdWorkInstructions()
      : getListIdDailyReports();

  try {
    const columns = await fetchListColumns(token, siteId, listId);
    const sorted = [...columns].sort((a, b) =>
      (a.displayName || a.name).localeCompare(b.displayName || b.name, "ja")
    );
    const envLines =
      which === "instructions"
        ? buildWorkInstructionFieldEnvLines(columns)
        : buildDailyReportFieldEnvLines(columns);
    return Response.json({
      list: which,
      columns: sorted,
      envLines,
      note:
        "envLines は表示名が完全一致した列だけです。欠ける列は SharePoint の表示名をアプリ既定に合わせるか、手動で .env に追加してください。",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
