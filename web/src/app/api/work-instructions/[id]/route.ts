import { bearerFromRequest } from "@/lib/graph/client";
import {
  fieldsFromWorkInstruction,
  patchItemFields,
  deleteItem,
  listItems,
  workInstructionFromFields,
} from "@/lib/graph/listItems";
import {
  getListIdWorkInstructions,
  getSharePointSiteId,
} from "@/lib/graph/env";
import { getEffectiveUser } from "@/lib/graph/effectiveUser";
import { parseWorkStyleInput } from "@/lib/instruction/workStyleLabel";
import type { WorkInstruction } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdWorkInstructions();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const wi = workInstructionFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!wi) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ item: wi });
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
    const listId = getListIdWorkInstructions();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const existing = workInstructionFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
    const body = (await req.json()) as Partial<WorkInstruction>;

    if (existing.adminId === me.id) {
      const merged: WorkInstruction = {
        ...existing,
        ...body,
        id: existing.id,
        createdAt: existing.createdAt,
        projects: body.projects ?? existing.projects,
        workStyle:
          body.workStyle !== undefined
            ? parseWorkStyleInput(body.workStyle)
            : existing.workStyle,
      };
      await patchItemFields(
        token,
        siteId,
        listId,
        id,
        fieldsFromWorkInstruction(merged)
      );
      return Response.json({ ok: true, item: merged });
    }

    if (existing.targetUserId === me.id) {
      const merged: WorkInstruction = {
        ...existing,
        ...body,
        id: existing.id,
        createdAt: existing.createdAt,
        adminId: existing.adminId,
        targetUserId: existing.targetUserId,
        projects: body.projects ?? existing.projects,
        note: typeof body.note === "string" ? body.note : existing.note,
        targetDate:
          typeof body.targetDate === "string"
            ? body.targetDate
            : existing.targetDate,
        workStyle:
          body.workStyle !== undefined
            ? parseWorkStyleInput(body.workStyle)
            : existing.workStyle,
        linkedReportId:
          typeof body.linkedReportId === "string"
            ? body.linkedReportId
            : existing.linkedReportId,
      };
      await patchItemFields(
        token,
        siteId,
        listId,
        id,
        fieldsFromWorkInstruction(merged)
      );
      return Response.json({ ok: true, item: merged });
    }

    return Response.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdWorkInstructions();
    const items = await listItems(token, siteId, listId);
    const found = items.find((it) => it.id === id);
    if (!found) return Response.json({ error: "Not found" }, { status: 404 });
    const wi = workInstructionFromFields(found.id, found.fields, {
      createdDateTime: found.createdDateTime,
      lastModifiedDateTime: found.lastModifiedDateTime,
    });
    if (!wi) return Response.json({ error: "Not found" }, { status: 404 });
    await deleteItem(token, siteId, listId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status });
  }
}
