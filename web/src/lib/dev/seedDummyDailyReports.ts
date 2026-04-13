import type { DailyReport } from "@/types/models";
import { fieldsFromDailyReport } from "@/lib/graph/listItems";

/** 五十嵐以外の提出先（ダミー） */
export const DUMMY_OTHER_SUBMISSION_TARGET =
  "b2000001-0000-4000-8000-000000000099";

function dummyReport(
  i: number,
  authorId: string,
  submissionTargetId: string
): Omit<DailyReport, "id"> {
  const dates = [
    "2026-04-07",
    "2026-04-08",
    "2026-04-09",
    "2026-04-10",
    "2026-04-04",
    "2026-04-05",
  ];
  const names = ["山田", "佐藤", "鈴木", "田中", "伊藤", "渡辺"];
  const date = dates[i] ?? "2026-04-01";
  const who = names[i] ?? `ユーザー${i + 1}`;

  const tasks: DailyReport["tasks"] = [
    {
      projectNumber: `PRJ-${i + 1}01`,
      projectName: `${who}さん担当：クライアントA`,
      taskDetail: "定例・仕様整理",
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
    },
    {
      projectNumber: "",
      projectName: "社内共有",
      taskDetail: "レビュー対応",
      startTime: "13:00",
      endTime: "17:30",
      duration: 270,
    },
  ];

  return {
    userId: authorId,
    submissionTargetId,
    date,
    weekday: "",
    workStyle: "office",
    clockInTime: "09:00",
    clockOutTime: "18:00",
    breakDurationHours: 1,
    totalWorkTime: 6.5,
    tasks,
    currentProjectLines: [
      {
        projectNumber: "PRJ-A",
        projectName: "案件A",
        content: `${who}：納期4月中で進行中`,
      },
      {
        projectNumber: "PRJ-B",
        projectName: "案件B",
        content: "見積回答待ち",
      },
    ],
    tomorrowLines: [
      {
        projectNumber: "",
        projectName: "クライアントAフォロー",
        content: `${date}の続き：ドキュメント更新・フォロー`,
      },
    ],
    summary: `【ダミー】${who}の業務報告書（自動投入）。本日の業務・手持ち案件・明日の予定はテスト用の文言です。`,
    createdAt: "",
    submittedAt: "",
  };
}

/**
 * @param authorUserId 記入者（名前）列に入れる Azure AD オブジェクト ID。投入操作したユーザー（ディレクトリに載っている実ユーザー）を渡すとダッシュボードで氏名表示される。
 */
export function buildDummyDailyReportFields(
  igarashiUserId: string,
  authorUserId: string
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < 6; i++) {
    const author = authorUserId;
    const toIgarashi = i < 3;
    const submissionTarget = toIgarashi
      ? igarashiUserId
      : DUMMY_OTHER_SUBMISSION_TARGET;
    const row = dummyReport(i, author, submissionTarget);
    out.push(fieldsFromDailyReport(row));
  }
  return out;
}
