import { bearerFromRequest } from "@/lib/graph/client";
import {
  dailyReportFromFields,
  fieldsFromDailyReport,
  createItem,
  listItems,
} from "@/lib/graph/listItems";
import { getListIdDailyReports, getSharePointSiteId } from "@/lib/graph/env";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import { parseWorkStyleInput } from "@/lib/instruction/workStyleLabel";
import type { DailyReport } from "@/types/models";

export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const items = await listItems(token, siteId, listId);
    const reports = items
      .map((it) =>
        dailyReportFromFields(it.id, it.fields, {
          createdDateTime: it.createdDateTime,
          lastModifiedDateTime: it.lastModifiedDateTime,
        })
      )
      .filter(Boolean) as DailyReport[];
    reports.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return Response.json({ items: reports });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const me = await getEffectiveUser(req, token);
    const body = (await req.json()) as Partial<DailyReport>;
    const breakH =
      typeof body.breakDurationHours === "number" && body.breakDurationHours >= 0
        ? body.breakDurationHours
        : 1;
    const report: Omit<DailyReport, "id"> = {
      userId: me.id,
      submissionTargetId: asString(body.submissionTargetId),
      date: body.date ?? "",
      weekday: body.weekday ?? "",
      workStyle: parseWorkStyleInput(body.workStyle),
      clockInTime: asString(body.clockInTime),
      clockOutTime: asString(body.clockOutTime),
      breakDurationHours: breakH,
      totalWorkTime: Number(body.totalWorkTime ?? 0),
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
      currentProjectLines: Array.isArray(body.currentProjectLines)
        ? body.currentProjectLines
        : [],
      tomorrowLines: Array.isArray(body.tomorrowLines) ? body.tomorrowLines : [],
      summary: body.summary ?? "",
      createdAt: "",
      submittedAt: "",
    };
    if (!report.submissionTargetId) {
      return Response.json(
        { error: "提出先（submissionTargetId）が必要です" },
        { status: 400 }
      );
    }
    const siteId = getSharePointSiteId();
    const listId = getListIdDailyReports();
    const created = await createItem(
      token,
      siteId,
      listId,
      fieldsFromDailyReport(report)
    );
    const dr = dailyReportFromFields(created.id, created.fields, {
      createdDateTime: created.createdDateTime,
      lastModifiedDateTime: created.lastModifiedDateTime,
    });
    return Response.json({ item: dr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

function asString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}
