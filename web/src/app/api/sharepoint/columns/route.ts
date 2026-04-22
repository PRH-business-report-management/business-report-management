import { bearerFromRequest } from "@/lib/graph/client";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import {
  buildDailyReportFieldEnvLines,
  buildHandheldFieldEnvLines,
  buildWorkInstructionFieldEnvLines,
  fetchListColumns,
} from "@/lib/graph/listColumns";
import {
  getListIdDailyReports,
  getListIdHandheldProjects,
  getListIdWorkInstructions,
  getSharePointSiteId,
} from "@/lib/graph/env";

/**
 * SharePoint リストの列（内部名 name / 表示名 displayName）を Graph で取得。
 * list=daily | instructions | handheld。表示名がアプリ既定と一致する列について .env 用の行も返す。
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
  const listParam = url.searchParams.get("list") ?? "daily";
  const which =
    listParam === "instructions"
      ? "instructions"
      : listParam === "handheld"
        ? "handheld"
        : "daily";
  const siteId = getSharePointSiteId();
  let listId: string;
  if (which === "instructions") {
    listId = getListIdWorkInstructions();
  } else if (which === "handheld") {
    const hid = getListIdHandheldProjects();
    if (!hid) {
      return Response.json(
        {
          error:
            "SHAREPOINT_LIST_HANDHELD_PROJECTS_ID が未設定です。手持ち案件用リストを作成してから ID を設定してください。",
        },
        { status: 400 }
      );
    }
    listId = hid;
  } else {
    listId = getListIdDailyReports();
  }

  try {
    const columns = await fetchListColumns(token, siteId, listId);
    const sorted = [...columns].sort((a, b) =>
      (a.displayName || a.name).localeCompare(b.displayName || b.name, "ja")
    );
    const envLines =
      which === "instructions"
        ? buildWorkInstructionFieldEnvLines(columns)
        : which === "handheld"
          ? buildHandheldFieldEnvLines(columns)
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
