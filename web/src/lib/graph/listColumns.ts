import { graphRequest } from "./client";

export type ListColumnMeta = { name: string; displayName?: string };

export async function fetchListColumns(
  accessToken: string,
  siteId: string,
  listId: string
): Promise<ListColumnMeta[]> {
  const out: ListColumnMeta[] = [];
  let url = `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/columns?$select=name,displayName`;
  for (;;) {
    const page = await graphRequest<{
      value: ListColumnMeta[];
      "@odata.nextLink"?: string;
    }>(accessToken, url);
    out.push(...(page.value ?? []));
    const next = page["@odata.nextLink"];
    if (!next) break;
    url = next;
  }
  return out;
}

/** 業務報告書リスト: 表示名（SharePoint の列名）→ .env の変数名 */
const DAILY_REPORT_DISPLAY_TO_ENV: Record<string, string> = {
  名前: "SHAREPOINT_DR_FIELD_USER_ID",
  提出先: "SHAREPOINT_DR_FIELD_SUBMISSION_TARGET",
  報告日: "SHAREPOINT_DR_FIELD_REPORT_DATE",
  勤務形態: "SHAREPOINT_DR_FIELD_WORK_STYLE",
  勤務時間: "SHAREPOINT_DR_FIELD_TOTAL_WORK_TIME",
  出社時間: "SHAREPOINT_DR_FIELD_CLOCK_IN",
  退勤時間: "SHAREPOINT_DR_FIELD_CLOCK_OUT",
  休憩時間: "SHAREPOINT_DR_FIELD_BREAK_HOURS",
  本日の業務内容: "SHAREPOINT_DR_FIELD_TASKS_JSON",
  現在の手持ち案件: "SHAREPOINT_DR_FIELD_CURRENT_PROJECTS",
  明日の作業予定: "SHAREPOINT_DR_FIELD_TOMORROW_PLAN",
  備考: "SHAREPOINT_DR_FIELD_SUMMARY",
};

/** 業務指示書リスト */
const WORK_INSTRUCTION_DISPLAY_TO_ENV: Record<string, string> = {
  管理者名: "SHAREPOINT_WI_FIELD_ADMIN_ID",
  従業員名: "SHAREPOINT_WI_FIELD_TARGET_USER_ID",
  対象日: "SHAREPOINT_WI_FIELD_TARGET_DATE",
  勤務時間: "SHAREPOINT_WI_FIELD_WORK_STYLE",
  業務内容: "SHAREPOINT_WI_FIELD_PROJECTS_JSON",
  備考: "SHAREPOINT_WI_FIELD_NOTE",
};

export function buildDailyReportFieldEnvLines(
  columns: ListColumnMeta[]
): string[] {
  const byEnv = new Map<string, string>();
  for (const c of columns) {
    const label = (c.displayName ?? "").trim();
    const envKey = DAILY_REPORT_DISPLAY_TO_ENV[label];
    if (envKey) byEnv.set(envKey, c.name);
  }
  return [...byEnv.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([k, v]) => `${k}=${v}`);
}

export function buildWorkInstructionFieldEnvLines(
  columns: ListColumnMeta[]
): string[] {
  const byEnv = new Map<string, string>();
  for (const c of columns) {
    const label = (c.displayName ?? "").trim();
    const envKey = WORK_INSTRUCTION_DISPLAY_TO_ENV[label];
    if (envKey) byEnv.set(envKey, c.name);
  }
  return [...byEnv.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([k, v]) => `${k}=${v}`);
}

/** 手持ち案件リスト（SharePoint 専用リスト） */
const HANDHELD_DISPLAY_TO_ENV: Record<string, string> = {
  名前: "SHAREPOINT_HP_FIELD_USER_ID",
  案件一覧: "SHAREPOINT_HP_FIELD_LINES_JSON",
};

export function buildHandheldFieldEnvLines(
  columns: ListColumnMeta[]
): string[] {
  const byEnv = new Map<string, string>();
  for (const c of columns) {
    const label = (c.displayName ?? "").trim();
    const envKey = HANDHELD_DISPLAY_TO_ENV[label];
    if (envKey) byEnv.set(envKey, c.name);
  }
  return [...byEnv.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([k, v]) => `${k}=${v}`);
}
