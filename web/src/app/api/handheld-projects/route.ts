import { bearerFromRequest } from "@/lib/graph/client";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import {
  findHandheldItemForUser,
  handheldLinesFromListItem,
  upsertHandheldProjects,
} from "@/lib/graph/handheldProjectsGraph";
import {
  getListIdHandheldProjects,
  getSharePointSiteId,
} from "@/lib/graph/env";
import type { ReportProjectLine } from "@/types/models";
import { z } from "zod";

const lineSchema = z.object({
  projectNumber: z.string(),
  projectName: z.string(),
  content: z.string(),
});

const putBodySchema = z.object({
  lines: z.array(lineSchema),
});

function normalizeLines(lines: ReportProjectLine[]): ReportProjectLine[] {
  return lines.map((l) => ({
    projectNumber: String(l.projectNumber ?? ""),
    projectName: String(l.projectName ?? ""),
    content: String(l.content ?? ""),
  }));
}

/**
 * GET: ログインユーザーの手持ち案件（SharePoint リストが設定されているとき）
 * 未設定時は persisted=local のみ（クライアントが localStorage を使う）
 */
export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const me = await getEffectiveUser(req, token);
    const listId = getListIdHandheldProjects();
    if (!listId) {
      return Response.json({
        lines: [] as ReportProjectLine[],
        persisted: "local" as const,
        message:
          "SHAREPOINT_LIST_HANDHELD_PROJECTS_ID が未設定のため、ブラウザにのみ保存されます。別端末で使うには env.example の「手持ち案件リスト」を参照して設定してください。",
      });
    }
    const siteId = getSharePointSiteId();
    const item = await findHandheldItemForUser(token, siteId, listId, me.id);
    const raw = handheldLinesFromListItem(item);
    const lines =
      raw.length > 0
        ? raw
        : [{ projectNumber: "", projectName: "", content: "" }];
    return Response.json({ lines, persisted: "sharepoint" as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

/** PUT: 手持ち案件を SharePoint に保存（1 ユーザー 1 アイテムで upsert） */
export async function PUT(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const listId = getListIdHandheldProjects();
  if (!listId) {
    return Response.json(
      {
        error:
          "手持ち案件用の SharePoint リストが未設定です。SHAREPOINT_LIST_HANDHELD_PROJECTS_ID を Azure のアプリ設定に追加してください。",
      },
      { status: 503 }
    );
  }
  try {
    const me = await getEffectiveUser(req, token);
    const parsed = putBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }
    const lines = normalizeLines(parsed.data.lines);
    const siteId = getSharePointSiteId();
    await upsertHandheldProjects(token, siteId, listId, me.id, lines);
    return Response.json({ ok: true, persisted: "sharepoint" as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
