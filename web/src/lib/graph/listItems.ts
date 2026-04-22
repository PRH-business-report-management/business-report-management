import { parseISO } from "date-fns";
import { decodeHtmlEntities } from "@/lib/text/decodeHtmlEntities";
import { stripSharePointHtml } from "@/lib/text/stripSharePointHtml";
import { graphRequest } from "./client";
import type { AuFieldKeys } from "./resolveAppUserFields";
import type { DailyReport, ReportProjectLine } from "@/types/models";
import type { WorkInstruction, WorkStyle } from "@/types/models";
import type { AppUser } from "@/types/models";

type Fields = Record<string, unknown>;

/** Graph は列の「内部名」。表示名と違う場合は .env の SHAREPOINT_*_FIELD_* で上書き */
function spField(envName: string, fallback: string): string {
  const v = process.env[envName]?.trim();
  return v && v.length > 0 ? v : fallback;
}

export type GraphListItem = {
  id: string;
  fields?: Fields;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
};

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function deriveWeekdayShort(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const iso = dateStr.length <= 10 ? `${dateStr}T12:00:00` : dateStr;
    const d = parseISO(iso);
    return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] ?? "";
  } catch {
    return "";
  }
}

function normalizeWorkStyle(v: unknown): WorkStyle {
  const s = asString(v).trim().toLowerCase();
  if (
    s === "remote" ||
    s === "リモート" ||
    s === "在宅" ||
    s === "テレワーク"
  ) {
    return "remote";
  }
  if (s === "direct" || s === "直行") {
    return "direct";
  }
  return "office";
}

function workStyleToSharePoint(ws: WorkStyle): string {
  if (ws === "remote") return "テレワーク";
  if (ws === "direct") return "直行";
  return "出社";
}

/** 業務報告書リスト（既定は日本語表示名相当。内部名が違う場合は env で上書き） */
export const DR_FIELDS = {
  userId: spField("SHAREPOINT_DR_FIELD_USER_ID", "名前"),
  submissionTargetId: spField(
    "SHAREPOINT_DR_FIELD_SUBMISSION_TARGET",
    "提出先"
  ),
  reportDate: spField("SHAREPOINT_DR_FIELD_REPORT_DATE", "報告日"),
  /** 日報の出社/テレワーク/直行（単一行テキスト。未設定時は出社扱い） */
  workStyle: spField("SHAREPOINT_DR_FIELD_WORK_STYLE", "勤務形態"),
  totalWorkTime: spField("SHAREPOINT_DR_FIELD_TOTAL_WORK_TIME", "勤務時間"),
  clockInTime: spField("SHAREPOINT_DR_FIELD_CLOCK_IN", "出社時間"),
  clockOutTime: spField("SHAREPOINT_DR_FIELD_CLOCK_OUT", "退勤時間"),
  breakDurationHours: spField(
    "SHAREPOINT_DR_FIELD_BREAK_HOURS",
    "休憩時間"
  ),
  tasksJson: spField("SHAREPOINT_DR_FIELD_TASKS_JSON", "本日の業務内容"),
  currentProjects: spField("SHAREPOINT_DR_FIELD_CURRENT_PROJECTS", "現在の手持ち案件"),
  tomorrowPlan: spField("SHAREPOINT_DR_FIELD_TOMORROW_PLAN", "明日の作業予定"),
  summary: spField("SHAREPOINT_DR_FIELD_SUMMARY", "備考"),
} as const;

/** 業務指示書リスト */
export const WI_FIELDS = {
  adminId: spField("SHAREPOINT_WI_FIELD_ADMIN_ID", "管理者名"),
  targetUserId: spField("SHAREPOINT_WI_FIELD_TARGET_USER_ID", "従業員名"),
  targetDate: spField("SHAREPOINT_WI_FIELD_TARGET_DATE", "対象日"),
  workStyle: spField("SHAREPOINT_WI_FIELD_WORK_STYLE", "勤務時間"),
  projectsJson: spField("SHAREPOINT_WI_FIELD_PROJECTS_JSON", "業務内容"),
  note: spField("SHAREPOINT_WI_FIELD_NOTE", "備考"),
} as const;

/** アプリユーザーリスト（400: Field '…' is not recognized のときは内部名を env で指定） */
export const AU_FIELDS = {
  azureAdUserId: spField("SHAREPOINT_AU_FIELD_AZURE_AD_ID", "ユーザー名"),
  role: spField("SHAREPOINT_AU_FIELD_ROLE", "権限"),
} as const;

type StoredWorkContent = {
  linkedReportId?: string;
  projects?: WorkInstruction["projects"];
};

function sanitizeSpText(s: string): string {
  return stripSharePointHtml(asString(s));
}

function tryJsonParse<T>(raw: string): T | null {
  const s = decodeHtmlEntities(stripSharePointHtml(raw.trim()));
  try {
    return JSON.parse(s) as T;
  } catch {
    try {
      return JSON.parse(stripSharePointHtml(raw.trim())) as T;
    } catch {
      return null;
    }
  }
}

/** 名称/詳細に JSON 配列文字列がそのまま入っている場合に展開 */
function repairInstructionProjects(
  projects: WorkInstruction["projects"]
): WorkInstruction["projects"] {
  const out: WorkInstruction["projects"] = [];
  for (const p of projects) {
    const pn = (p.projectName ?? "").trim();
    const td = (p.taskDetail ?? "").trim();
    const blob = pn.startsWith("[{") ? pn : td.startsWith("[{") ? td : "";
    if (blob) {
      const parsed = tryJsonParse<unknown>(blob);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const row of parsed) {
          if (row && typeof row === "object") {
            const o = row as Record<string, unknown>;
            out.push({
              projectNumber: sanitizeSpText(asString(o.projectNumber)),
              projectName: sanitizeSpText(asString(o.projectName)),
              taskDetail: sanitizeSpText(
                asString(o.taskDetail ?? o.content)
              ),
            });
          }
        }
        continue;
      }
    }
    out.push(p);
  }
  return out.length > 0
    ? out
    : [{ projectNumber: "", projectName: "", taskDetail: "" }];
}

function normalizeReportLine(x: unknown): ReportProjectLine {
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return {
      projectNumber: sanitizeSpText(asString(o.projectNumber)),
      projectName: sanitizeSpText(asString(o.projectName)),
      content: sanitizeSpText(asString(o.content ?? o.taskDetail)),
    };
  }
  return { projectNumber: "", projectName: "", content: "" };
}

/** 列値: JSON 配列 or 旧来のプレーンテキスト（HTML エンコードされた JSON にも対応） */
export function parseProjectLinesField(raw: unknown): ReportProjectLine[] {
  if (raw == null) return [];
  const str = decodeHtmlEntities(stripSharePointHtml(asString(raw).trim()));
  if (!str) return [];
  try {
    const p = JSON.parse(str) as unknown;
    if (Array.isArray(p)) {
      return p.map(normalizeReportLine).filter((line) => line != null);
    }
  } catch {
    /* レガシー: 単一テキスト */
  }
  if (str.startsWith("[{")) {
    const again = tryJsonParse<unknown>(str);
    if (Array.isArray(again)) {
      return again.map(normalizeReportLine).filter((line) => line != null);
    }
  }
  return [
    {
      projectNumber: "",
      projectName: "",
      content: sanitizeSpText(str),
    },
  ];
}

function normalizeDailyTasks(tasks: DailyReport["tasks"]): DailyReport["tasks"] {
  return tasks.map((t) => ({
    ...t,
    projectNumber: sanitizeSpText(
      typeof (t as { projectNumber?: string }).projectNumber === "string"
        ? (t as { projectNumber: string }).projectNumber
        : ""
    ),
    projectName: sanitizeSpText(
      typeof (t as { projectName?: string }).projectName === "string"
        ? (t as { projectName: string }).projectName
        : ""
    ),
    taskDetail: sanitizeSpText(
      typeof (t as { taskDetail?: string }).taskDetail === "string"
        ? (t as { taskDetail: string }).taskDetail
        : ""
    ),
  }));
}

export function serializeProjectLines(lines: ReportProjectLine[]): string {
  return JSON.stringify(lines ?? []);
}

export function dailyReportFromFields(
  itemId: string,
  f: Fields | undefined,
  meta?: { createdDateTime?: string; lastModifiedDateTime?: string }
): DailyReport | null {
  if (!f) return null;
  const rawDate = asString(f[DR_FIELDS.reportDate]);
  const date = rawDate ? rawDate.slice(0, 10) : "";

  const tasksRaw = f[DR_FIELDS.tasksJson];
  let tasks: DailyReport["tasks"] = [];
  try {
    if (typeof tasksRaw === "string" && tasksRaw.trim()) {
      const decoded = decodeHtmlEntities(stripSharePointHtml(tasksRaw.trim()));
      tasks = JSON.parse(decoded) as DailyReport["tasks"];
    } else if (Array.isArray(tasksRaw)) {
      tasks = tasksRaw as DailyReport["tasks"];
    } else {
      tasks = [];
    }
  } catch {
    // SharePoint 側が HTML で包む／壊れた JSON のときは「空」にせず、
    // 最低限ユーザーが痕跡を確認できるようにする（復旧は手作業想定）
    const rawText =
      typeof tasksRaw === "string" ? sanitizeSpText(tasksRaw).trim() : "";
    tasks =
      rawText && rawText.length > 0
        ? [
            {
              projectNumber: "",
              projectName: "",
              taskDetail: rawText,
              startTime: "",
              endTime: "",
              duration: 0,
            },
          ]
        : [];
  }
  tasks = normalizeDailyTasks(tasks);

  const currentProjectLines = parseProjectLinesField(f[DR_FIELDS.currentProjects]);
  const tomorrowLines = parseProjectLinesField(f[DR_FIELDS.tomorrowPlan]);

  const createdAt = meta?.createdDateTime?.trim() ?? "";
  const submittedAt = meta?.lastModifiedDateTime?.trim() ?? "";

  return {
    id: itemId,
    userId: asString(f[DR_FIELDS.userId]),
    submissionTargetId: asString(f[DR_FIELDS.submissionTargetId]),
    date: date || rawDate,
    weekday: deriveWeekdayShort(date || rawDate),
    workStyle: normalizeWorkStyle(f[DR_FIELDS.workStyle]),
    clockInTime: normalizeClockHmExtended(asString(f[DR_FIELDS.clockInTime])),
    clockOutTime: normalizeClockHmExtended(asString(f[DR_FIELDS.clockOutTime])),
    breakDurationHours: (() => {
      const v = asNumber(f[DR_FIELDS.breakDurationHours]);
      return v > 0 ? v : 1;
    })(),
    totalWorkTime: asNumber(f[DR_FIELDS.totalWorkTime]),
    tasks,
    currentProjectLines,
    tomorrowLines,
    summary: sanitizeSpText(asString(f[DR_FIELDS.summary])),
    createdAt,
    submittedAt,
  };
}

/** 日付時刻文字列や多様な入力から HH:mm を抽出（0〜23時） */
function normalizeClockHm(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** 退勤用: 翌日深夜2時まで（24:00〜26:00 の30時間表記）を許可 */
function normalizeClockHmExtended(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  let h = parseInt(m[1]!, 10);
  let min = parseInt(m[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return "";
  if (h >= 24) {
    h = Math.min(26, Math.max(24, h));
    min = Math.min(59, Math.max(0, min));
    if (h === 26 && min > 0) min = 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return normalizeClockHm(s);
}

export function fieldsFromDailyReport(
  r: Omit<DailyReport, "id"> | DailyReport
): Fields {
  const title = `業務報告書 ${r.date} ${r.userId}`;
  const dateIso = r.date ? `${r.date}T12:00:00Z` : "";
  return {
    Title: title,
    [DR_FIELDS.userId]: r.userId,
    [DR_FIELDS.submissionTargetId]: r.submissionTargetId ?? "",
    [DR_FIELDS.reportDate]: dateIso,
    [DR_FIELDS.workStyle]: workStyleToSharePoint(r.workStyle ?? "office"),
    [DR_FIELDS.totalWorkTime]: r.totalWorkTime,
    [DR_FIELDS.clockInTime]: r.clockInTime ?? "",
    [DR_FIELDS.clockOutTime]: r.clockOutTime ?? "",
    [DR_FIELDS.breakDurationHours]: r.breakDurationHours ?? 1,
    [DR_FIELDS.tasksJson]: JSON.stringify(r.tasks ?? []),
    [DR_FIELDS.currentProjects]: serializeProjectLines(r.currentProjectLines ?? []),
    [DR_FIELDS.tomorrowPlan]: serializeProjectLines(r.tomorrowLines ?? []),
    [DR_FIELDS.summary]: r.summary,
  };
}

export function workInstructionFromFields(
  itemId: string,
  f: Fields | undefined,
  meta?: { createdDateTime?: string; lastModifiedDateTime?: string }
): WorkInstruction | null {
  if (!f) return null;

  let linkedReportId = "";
  let projects: WorkInstruction["projects"] = [];
  const projectsRaw = f[WI_FIELDS.projectsJson];
  try {
    if (typeof projectsRaw === "string" && projectsRaw.trim()) {
      const decoded = decodeHtmlEntities(stripSharePointHtml(projectsRaw.trim()));
      const parsed = JSON.parse(decoded) as unknown;
      if (Array.isArray(parsed)) {
        projects = parsed as WorkInstruction["projects"];
      } else if (parsed && typeof parsed === "object") {
        const st = parsed as StoredWorkContent;
        linkedReportId = asString(st.linkedReportId);
        projects = Array.isArray(st.projects) ? st.projects : [];
      }
    } else if (Array.isArray(projectsRaw)) {
      projects = projectsRaw as WorkInstruction["projects"];
    }
  } catch {
    projects = [];
  }

  projects = projects.map((p) => ({
    projectNumber: sanitizeSpText(
      typeof p.projectNumber === "string" ? p.projectNumber : ""
    ),
    projectName: sanitizeSpText(p.projectName ?? ""),
    taskDetail: sanitizeSpText(p.taskDetail ?? ""),
  }));
  projects = repairInstructionProjects(projects);

  const rawTarget = asString(f[WI_FIELDS.targetDate]);
  const targetDate =
    rawTarget && rawTarget.includes("T")
      ? rawTarget.slice(0, 10)
      : rawTarget.slice(0, 10);

  const createdAt = meta?.createdDateTime?.trim() || "";
  const submittedAt =
    meta?.lastModifiedDateTime?.trim() || createdAt || "";

  return {
    id: itemId,
    adminId: asString(f[WI_FIELDS.adminId]),
    targetUserId: asString(f[WI_FIELDS.targetUserId]),
    linkedReportId,
    targetDate,
    workStyle: normalizeWorkStyle(f[WI_FIELDS.workStyle]),
    projects,
    note: sanitizeSpText(asString(f[WI_FIELDS.note])),
    createdAt,
    submittedAt,
  };
}

export function fieldsFromWorkInstruction(
  w: Omit<WorkInstruction, "id"> | WorkInstruction
): Fields {
  const title = `業務指示 ${w.targetDate || "—"} ${w.targetUserId?.slice(0, 8) ?? ""}`;
  const content: StoredWorkContent = {
    linkedReportId: w.linkedReportId || "",
    projects: w.projects ?? [],
  };

  const fields: Fields = {
    Title: title,
    [WI_FIELDS.adminId]: w.adminId,
    [WI_FIELDS.targetUserId]: w.targetUserId,
    [WI_FIELDS.workStyle]: workStyleToSharePoint(w.workStyle),
    [WI_FIELDS.projectsJson]: JSON.stringify(content),
    [WI_FIELDS.note]: w.note,
  };

  if (w.targetDate) {
    fields[WI_FIELDS.targetDate] = `${w.targetDate}T12:00:00Z`;
  }

  return fields;
}

export function appUserFromFields(
  itemId: string,
  f: Fields | undefined,
  keys: AuFieldKeys
): AppUser | null {
  if (!f) return null;
  return {
    id: itemId,
    azureAdUserId: asString(f[keys.azureAdUserId]),
    email: "",
    displayName: asString(f["Title"]),
  };
}

export function fieldsFromAppUser(
  u: Omit<AppUser, "id"> | AppUser,
  keys: AuFieldKeys
): Fields {
  return {
    Title: u.displayName || u.email || u.azureAdUserId,
    [keys.azureAdUserId]: u.azureAdUserId,
    [keys.role]: "メンバー",
  };
}

export async function listItems(
  accessToken: string,
  siteId: string,
  listId: string
): Promise<GraphListItem[]> {
  const out: GraphListItem[] = [];
  let url: string =
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?expand=fields&$top=200`;
  for (;;) {
    const page = await graphRequest<{
      value: GraphListItem[];
      "@odata.nextLink"?: string;
    }>(accessToken, url);
    out.push(...(page.value ?? []));
    const next = page["@odata.nextLink"];
    if (!next) break;
    url = next;
  }
  return out;
}

export async function createItem(
  accessToken: string,
  siteId: string,
  listId: string,
  fields: Fields
) {
  return graphRequest<GraphListItem>(
    accessToken,
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`,
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    }
  );
}

export async function patchItemFields(
  accessToken: string,
  siteId: string,
  listId: string,
  itemId: string,
  fields: Fields
) {
  return graphRequest<unknown>(
    accessToken,
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/fields`,
    {
      method: "PATCH",
      body: JSON.stringify(fields),
    }
  );
}

export async function deleteItem(
  accessToken: string,
  siteId: string,
  listId: string,
  itemId: string
) {
  await graphRequest<unknown>(
    accessToken,
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  );
}
