import type { WorkInstruction } from "@/types/models";

/** 指示書の業務内容・備考から「明日の作業予定」用テキストを組み立てる */
export function formatTomorrowPlanFromInstruction(wi: WorkInstruction): string {
  const lines = wi.projects
    .filter((p) => p.projectName.trim() || p.taskDetail.trim())
    .map((p) => {
      const name = p.projectName.trim();
      const detail = p.taskDetail.trim();
      if (name && detail) return `・${name}：${detail}`;
      if (name) return `・${name}`;
      return `・${detail}`;
    });
  const note = wi.note.trim();
  if (note) lines.push(`（備考）${note}`);
  return lines.join("\n");
}
