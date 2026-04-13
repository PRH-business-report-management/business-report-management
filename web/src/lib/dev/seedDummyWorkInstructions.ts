import type { WorkInstruction } from "@/types/models";
import { fieldsFromWorkInstruction } from "@/lib/graph/listItems";
import { DUMMY_OTHER_SUBMISSION_TARGET } from "@/lib/dev/seedDummyDailyReports";

function dummyInstruction(
  i: number,
  adminId: string,
  targetUserId: string
): Omit<WorkInstruction, "id"> {
  const dates = ["2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"];
  const date = dates[i] ?? "2026-04-14";
  const styles: WorkInstruction["workStyle"][] = [
    "office",
    "remote",
    "office",
    "direct",
  ];
  const topics = [
    "週次レポート提出",
    "顧客訪問の準備",
    "社内ツールの入力確認",
    "来週スプリントの優先タスク",
  ];

  return {
    adminId,
    targetUserId,
    linkedReportId: "",
    targetDate: date,
    workStyle: styles[i] ?? "office",
    projects: [
      {
        projectNumber: `INS-${i + 1}01`,
        projectName: `【ダミー】案件サンプル ${i + 1}`,
        taskDetail: `${topics[i] ?? "対応"}\n期限: ${date} までに一次報告をお願いします。\n成果物は共有フォルダへ格納してください。`,
      },
      {
        projectNumber: `INS-${i + 1}02`,
        projectName: "関連タスク",
        taskDetail: "関係者へメールで日程調整。必要なら資料を添付。",
      },
      {
        projectNumber: "",
        projectName: "社内連絡",
        taskDetail: "進捗があれば Teams で共有ください。不明点は指示者まで。",
      },
    ],
    note: `【ダミー】テスト用の業務指示書（自動投入 #${i + 1}）。優先度は通常。`,
    createdAt: "",
    submittedAt: "",
  };
}

/**
 * ダミー業務指示書 4 件分の fields。
 * 2 件は targetPrimary 宛、2 件は別ダミー GUID 宛。
 */
export function buildDummyWorkInstructionFields(
  adminUserId: string,
  targetPrimaryUserId: string
): Record<string, unknown>[] {
  const targets = [
    targetPrimaryUserId,
    targetPrimaryUserId,
    DUMMY_OTHER_SUBMISSION_TARGET,
    DUMMY_OTHER_SUBMISSION_TARGET,
  ];
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < 4; i++) {
    const row = dummyInstruction(i, adminUserId, targets[i]!);
    out.push(fieldsFromWorkInstruction(row));
  }
  return out;
}
