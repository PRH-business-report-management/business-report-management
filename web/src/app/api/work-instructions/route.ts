import { bearerFromRequest } from "@/lib/graph/client";
import {
  createItem,
  fieldsFromWorkInstruction,
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

export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getEffectiveUser(req, token);
    const siteId = getSharePointSiteId();
    const listId = getListIdWorkInstructions();
    const items = await listItems(token, siteId, listId);
    const list = items
      .map((it) =>
        workInstructionFromFields(it.id, it.fields, {
          createdDateTime: it.createdDateTime,
          lastModifiedDateTime: it.lastModifiedDateTime,
        })
      )
      .filter(Boolean) as WorkInstruction[];
    return Response.json({ items: list });
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
    const body = (await req.json()) as Partial<WorkInstruction>;
    const row: Omit<WorkInstruction, "id"> = {
      adminId: me.id,
      targetUserId: body.targetUserId ?? "",
      linkedReportId: body.linkedReportId ?? "",
      targetDate: body.targetDate ?? "",
      workStyle: parseWorkStyleInput(body.workStyle),
      projects: Array.isArray(body.projects) ? body.projects : [],
      note: body.note ?? "",
      createdAt: "",
      submittedAt: "",
    };
    const siteId = getSharePointSiteId();
    const listId = getListIdWorkInstructions();
    const created = await createItem(
      token,
      siteId,
      listId,
      fieldsFromWorkInstruction(row)
    );
    const item = workInstructionFromFields(created.id, created.fields, {
      createdDateTime: created.createdDateTime,
      lastModifiedDateTime: created.lastModifiedDateTime,
    });
    return Response.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
