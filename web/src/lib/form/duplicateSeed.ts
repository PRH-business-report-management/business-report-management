import { addDays, format, parseISO } from "date-fns";
import type { DailyReport, WorkInstruction } from "@/types/models";

function addOneDayYmd(ymd: string): string {
  if (!ymd?.trim() || ymd.length < 10) return "";
  try {
    const d = addDays(parseISO(`${ymd.slice(0, 10)}T12:00:00`), 1);
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * 業務報告書の「明日の作業予定」行を業務指示書の業務内容に転記する初期値。
 * 対象者は報告書の記入者、紐づけは報告書 ID。
 */
export function seedWorkInstructionFromReportTomorrow(
  report: DailyReport
): Partial<WorkInstruction> {
  const lines = report.tomorrowLines ?? [];
  const projects =
    lines.length > 0
      ? lines.map((l, i) => {
          const num = (l.projectNumber ?? "").trim();
          const name = (l.projectName ?? "").trim();
          const content = (l.content ?? "").trim();
          const projectName =
            name ||
            (num ? `案件 ${num}` : "") ||
            (content ? content.slice(0, 48) : "") ||
            `明日の予定 ${i + 1}`;
          const taskDetail =
            content || (name && name !== projectName ? name : "") || "（詳細なし）";
          return {
            projectNumber: num,
            projectName: projectName.length ? projectName : "明日の作業予定",
            taskDetail,
          };
        })
      : [
          {
            projectNumber: "",
            projectName: "明日の作業予定",
            taskDetail:
              "報告書に「明日の作業予定」の行がありません。必要に応じて編集してください。",
          },
        ];

  return {
    targetUserId: report.userId,
    linkedReportId: report.id,
    targetDate: addOneDayYmd(report.date),
    workStyle: report.workStyle,
    projects,
    note: "",
  };
}

/** 保存済み日報から新規作成用の初期値（ID・監査系は持たない） */
export function seedDailyReportFromDuplicate(
  source: DailyReport
): Partial<DailyReport> {
  return {
    date: source.date,
    weekday: source.weekday,
    workStyle: source.workStyle,
    clockInTime: source.clockInTime,
    clockOutTime: source.clockOutTime,
    breakDurationHours: source.breakDurationHours,
    totalWorkTime: source.totalWorkTime,
    submissionTargetId: source.submissionTargetId,
    tasks: JSON.parse(JSON.stringify(source.tasks)) as DailyReport["tasks"],
    currentProjectLines: JSON.parse(
      JSON.stringify(source.currentProjectLines)
    ) as DailyReport["currentProjectLines"],
    tomorrowLines: JSON.parse(
      JSON.stringify(source.tomorrowLines)
    ) as DailyReport["tomorrowLines"],
    summary: source.summary,
  };
}

/** 保存済み指示書から新規作成用の初期値 */
export function seedWorkInstructionFromDuplicate(
  source: WorkInstruction
): Partial<WorkInstruction> {
  return {
    targetUserId: source.targetUserId,
    targetDate: source.targetDate,
    workStyle: source.workStyle,
    projects: JSON.parse(
      JSON.stringify(source.projects)
    ) as WorkInstruction["projects"],
    note: source.note ?? "",
  };
}
