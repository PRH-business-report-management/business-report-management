import { bearerFromRequest } from "@/lib/graph/client";
import { createItem } from "@/lib/graph/listItems";
import { getListIdDailyReports, getSharePointSiteId } from "@/lib/graph/env";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import { buildDummyDailyReportFields } from "@/lib/dev/seedDummyDailyReports";

function seedAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_SEED === "true"
  );
}

/**
 * 開発用: ダミー業務報告書を SharePoint に複数件作成（呼び出しユーザーのトークンで Graph 実行）。
 * body: { igarashiUserId?: string } — 省略時は環境変数 SEED_IGARASHI_AAD_ID（なければ 400）。
 */
export async function POST(req: Request) {
  if (!seedAllowed()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { igarashiUserId?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as { igarashiUserId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const igarashi =
    (body.igarashiUserId?.trim() ||
      process.env.SEED_IGARASHI_AAD_ID?.trim()) ??
    "";
  if (!igarashi) {
    return Response.json(
      {
        error:
          "五十嵐さんの Azure AD オブジェクト ID が必要です。body.igarashiUserId または環境変数 SEED_IGARASHI_AAD_ID を設定してください。",
      },
      { status: 400 }
    );
  }

  try {
    const me = await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const fieldSets = buildDummyDailyReportFields(igarashi, me.id);
    const createdIds: string[] = [];
    for (const fields of fieldSets) {
      const item = await createItem(token, siteId, listId, fields);
      createdIds.push(item.id);
    }
    return Response.json({
      ok: true,
      count: createdIds.length,
      itemIds: createdIds,
      message:
        "ダミー業務報告書を SharePoint に作成しました。記入者は現在サインイン中のユーザーです。提出先が五十嵐さんのものは3件です。",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
