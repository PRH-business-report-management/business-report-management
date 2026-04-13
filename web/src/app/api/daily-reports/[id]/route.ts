import { bearerFromRequest } from "@/lib/graph/client";
import {
  dailyReportFromFields,
  fieldsFromDailyReport,
  patchItemFields,
  deleteItem,
  listItems,
} from "@/lib/graph/listItems";
import { getListIdDailyReports, getSharePointSiteId } from "@/lib/graph/env";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import { parseWorkStyleInput } from "@/lib/instruction/workStyleLabel";
import type { DailyReport } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const dr = dailyReportFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!dr) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ item: dr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const me = await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const existing = dailyReportFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
    const canEdit =
      existing.userId === me.id || existing.submissionTargetId === me.id;
    if (!canEdit) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as Partial<DailyReport>;
    const merged: DailyReport = {
      ...existing,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      submittedAt: existing.submittedAt,
      date: typeof body.date === "string" ? body.date : existing.date,
      weekday: typeof body.weekday === "string" ? body.weekday : existing.weekday,
      workStyle:
        body.workStyle !== undefined
          ? parseWorkStyleInput(body.workStyle)
          : existing.workStyle,
      clockInTime:
        typeof body.clockInTime === "string"
          ? body.clockInTime
          : existing.clockInTime,
      clockOutTime:
        typeof body.clockOutTime === "string"
          ? body.clockOutTime
          : existing.clockOutTime,
      breakDurationHours:
        typeof body.breakDurationHours === "number" &&
        body.breakDurationHours >= 0
          ? body.breakDurationHours
          : existing.breakDurationHours,
      totalWorkTime:
        typeof body.totalWorkTime === "number"
          ? body.totalWorkTime
          : existing.totalWorkTime,
      submissionTargetId:
        typeof body.submissionTargetId === "string"
          ? body.submissionTargetId.trim()
          : existing.submissionTargetId,
      tasks: body.tasks ?? existing.tasks,
      currentProjectLines:
        body.currentProjectLines ?? existing.currentProjectLines,
      tomorrowLines: body.tomorrowLines ?? existing.tomorrowLines,
      summary: typeof body.summary === "string" ? body.summary : existing.summary,
    };
    if (!merged.submissionTargetId) {
      return Response.json(
        { error: "提出先（submissionTargetId）が必要です" },
        { status: 400 }
      );
    }
    const fields = fieldsFromDailyReport(merged);
    await patchItemFields(token, siteId, listId, id, fields);
    const refreshed = await listItems(token, siteId, listId);
    const after = refreshed.find((it) => it.id === id);
    const item = after
      ? dailyReportFromFields(after.id, after.fields, {
          createdDateTime: after.createdDateTime,
          lastModifiedDateTime: after.lastModifiedDateTime,
        })
      : null;
    return Response.json({ ok: true, item: item ?? merged });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const dr = dailyReportFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!dr) return Response.json({ error: "Not found" }, { status: 404 });
    await deleteItem(token, siteId, listId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
