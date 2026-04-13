import type { DailyReport, InstructionProject, ReportProjectLine } from "@/types/models";

/** 指示書の業務行を日報の「明日の予定」行に変換 */
export function instructionProjectsToReportLines(
  projects: InstructionProject[],
  note: string
): ReportProjectLine[] {
  const lines = projects.map((p) => ({
    projectNumber: p.projectNumber?.trim() ?? "",
    projectName: p.projectName,
    content: p.taskDetail,
  }));
  if (note.trim()) {
    lines.push({
      projectNumber: "",
      projectName: "備考",
      content: note.trim(),
    });
  }
  return lines;
}

/** 紐づけ日報から指示書の業務行へ（番号・名称・内容を転記） */
export function dailyReportToInstructionProjects(dr: DailyReport): InstructionProject[] {
  const fromTasks = (dr.tasks ?? []).map((t) => ({
    projectNumber: t.projectNumber?.trim() ?? "",
    projectName: t.projectName,
    taskDetail: t.taskDetail,
  }));
  const fromCurrent = (dr.currentProjectLines ?? []).map((l) => ({
    projectNumber: l.projectNumber?.trim() ?? "",
    projectName: l.projectName,
    taskDetail: l.content,
  }));
  const fromTomorrow = (dr.tomorrowLines ?? []).map((l) => ({
    projectNumber: l.projectNumber?.trim() ?? "",
    projectName: l.projectName,
    taskDetail: l.content,
  }));
  const merged = [...fromTasks, ...fromCurrent, ...fromTomorrow].filter(
    (p) =>
      p.projectNumber.trim() ||
      p.projectName.trim() ||
      p.taskDetail.trim()
  );
  return merged.length > 0
    ? merged
    : [{ projectNumber: "", projectName: "", taskDetail: "" }];
}

/** ダッシュボード等用の1行サマリ（先頭行） */
export function flattenTomorrowPreview(report: DailyReport): string {
  const lines = report.tomorrowLines ?? [];
  if (lines.length > 0) {
    const l = lines[0]!;
    const parts = [l.projectNumber, l.projectName, l.content].filter((x) =>
      String(x ?? "").trim()
    );
    return parts.join(" ").trim();
  }
  return "";
}

/** 閲覧・比較用に行をテキスト化 */
export function flattenReportLinesDisplay(
  lines: ReportProjectLine[] | undefined
): string {
  if (!lines?.length) return "";
  return lines
    .map((l) => {
      const head = [l.projectNumber, l.projectName]
        .filter((x) => x?.trim())
        .join(" ");
      const c = l.content?.trim() ?? "";
      if (head && c) return `${head}：${c}`;
      if (head) return head;
      return c;
    })
    .filter(Boolean)
    .join("\n");
}
