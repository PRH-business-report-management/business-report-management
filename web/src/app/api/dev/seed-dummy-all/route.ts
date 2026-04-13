import { bearerFromRequest } from "@/lib/graph/client";
import { createItem } from "@/lib/graph/listItems";
import {
  getListIdDailyReports,
  getListIdWorkInstructions,
  getSharePointSiteId,
} from "@/lib/graph/env";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import { buildDummyDailyReportFields } from "@/lib/dev/seedDummyDailyReports";
import { buildDummyWorkInstructionFields } from "@/lib/dev/seedDummyWorkInstructions";

function seedAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_SEED === "true"
  );
}

type Body = {
  igarashiUserId?: string;
  /** 既定 true */
  reports?: boolean;
  /** 既定 true */
  instructions?: boolean;
};

/**
 * 開発用: ダミー業務報告書（6件）と業務指示書（4件）を SharePoint に作成。
 * body: { igarashiUserId?, reports?, instructions? }
 */
export async function POST(req: Request) {
  if (!seedAllowed()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Body;
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
          "提出先／指示の宛先に使う Azure AD オブジェクト ID が必要です。body.igarashiUserId または SEED_IGARASHI_AAD_ID を設定してください。",
      },
      { status: 400 }
    );
  }

  const wantReports = body.reports !== false;
  const wantInstructions = body.instructions !== false;

  try {
    const me = await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const reportIds: string[] = [];
    const instructionIds: string[] = [];

    if (wantReports) {
      const listId = getListIdDailyReports();
      for (const fields of buildDummyDailyReportFields(igarashi, me.id)) {
        const item = await createItem(token, siteId, listId, fields);
        reportIds.push(item.id);
      }
    }

    if (wantInstructions) {
      const listId = getListIdWorkInstructions();
      for (const fields of buildDummyWorkInstructionFields(me.id, igarashi)) {
        const item = await createItem(token, siteId, listId, fields);
        instructionIds.push(item.id);
      }
    }

    return Response.json({
      ok: true,
      reports: { count: reportIds.length, itemIds: reportIds },
      instructions: { count: instructionIds.length, itemIds: instructionIds },
      message: `ダミーを作成しました（業務報告書 ${reportIds.length} 件、業務指示書 ${instructionIds.length} 件）。指示書の指示者は現在サインイン中のユーザーです。`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
