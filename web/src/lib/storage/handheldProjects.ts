import type { ReportProjectLine } from "@/types/models";

const STORAGE_PREFIX = "brm.handheldProjects.v1:";

export function defaultHandheldLine(): ReportProjectLine {
  return { projectNumber: "", projectName: "", content: "" };
}

export function readHandheldLines(userId: string): ReportProjectLine[] {
  if (!userId || typeof window === "undefined") {
    return [defaultHandheldLine()];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return [defaultHandheldLine()];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [defaultHandheldLine()];
    }
    return parsed.map((row) => ({
      projectNumber: String((row as ReportProjectLine)?.projectNumber ?? ""),
      projectName: String((row as ReportProjectLine)?.projectName ?? ""),
      content: String((row as ReportProjectLine)?.content ?? ""),
    }));
  } catch {
    return [defaultHandheldLine()];
  }
}

export function writeHandheldLines(
  userId: string,
  lines: ReportProjectLine[]
): void {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(lines));
}

/** SharePoint 保存用: 空行を除いたスナップショット */
export function handheldSnapshotForReport(
  lines: ReportProjectLine[]
): ReportProjectLine[] {
  const compact = lines.filter(
    (l) =>
      l.projectNumber.trim() ||
      l.projectName.trim() ||
      l.content.trim()
  );
  return compact.length > 0 ? compact : [];
}
