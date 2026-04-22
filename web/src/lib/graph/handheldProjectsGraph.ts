import {
  createItem,
  listItems,
  parseProjectLinesField,
  patchItemFields,
  serializeProjectLines,
  type GraphListItem,
} from "@/lib/graph/listItems";
import type { ReportProjectLine } from "@/types/models";

function spField(envName: string, fallback: string): string {
  const v = process.env[envName]?.trim();
  return v && v.length > 0 ? v : fallback;
}

/** 手持ち案件リストの列（内部名は env で上書き可） */
export const HP_FIELDS = {
  /** 記入者の Azure AD オブジェクト ID（日報の「名前」と同様の値） */
  userId: spField("SHAREPOINT_HP_FIELD_USER_ID", "名前"),
  /** 行配列の JSON（複数行テキスト） */
  linesJson: spField("SHAREPOINT_HP_FIELD_LINES_JSON", "案件一覧"),
} as const;

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

export function handheldLinesFromListItem(
  item: GraphListItem | null | undefined
): ReportProjectLine[] {
  if (!item?.fields) return [];
  return parseProjectLinesField(item.fields[HP_FIELDS.linesJson]);
}

export function fieldsForHandheldUpsert(
  userId: string,
  lines: ReportProjectLine[]
): Record<string, unknown> {
  const title = `手持ち ${userId.slice(0, 8)}…`;
  return {
    Title: title,
    [HP_FIELDS.userId]: userId,
    [HP_FIELDS.linesJson]: serializeProjectLines(lines ?? []),
  };
}

/** 同一ユーザーの項目を検索（リストが小さい前提で全件走査） */
export async function findHandheldItemForUser(
  accessToken: string,
  siteId: string,
  listId: string,
  userId: string
): Promise<GraphListItem | null> {
  const items = await listItems(accessToken, siteId, listId);
  return (
    items.find(
      (it) => asString(it.fields?.[HP_FIELDS.userId]) === userId
    ) ?? null
  );
}

export async function upsertHandheldProjects(
  accessToken: string,
  siteId: string,
  listId: string,
  userId: string,
  lines: ReportProjectLine[]
): Promise<GraphListItem> {
  const existing = await findHandheldItemForUser(
    accessToken,
    siteId,
    listId,
    userId
  );
  const fields = fieldsForHandheldUpsert(userId, lines);
  if (existing?.id) {
    await patchItemFields(accessToken, siteId, listId, existing.id, fields);
    return {
      ...existing,
      fields: { ...((existing.fields as object) ?? {}), ...fields },
    };
  }
  return createItem(accessToken, siteId, listId, fields);
}
