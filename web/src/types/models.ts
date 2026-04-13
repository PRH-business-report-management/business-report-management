/** 番号・案件名・内容のみの行（手持ち／明日の予定など） */
export type ReportProjectLine = {
  projectNumber: string;
  projectName: string;
  content: string;
};

export type DailyTask = {
  projectNumber: string;
  projectName: string;
  taskDetail: string;
  startTime: string;
  endTime: string;
  duration: number;
};

export type WorkStyle = "office" | "remote" | "direct";

export type DailyReport = {
  id: string;
  userId: string;
  /** 提出先（Azure AD オブジェクト ID）。通知の対象 */
  submissionTargetId: string;
  date: string;
  weekday: string;
  /** 出社 / テレワーク / 直行 */
  workStyle: WorkStyle;
  /** 出社・始業（HH:mm） */
  clockInTime: string;
  /** 退勤（HH:mm） */
  clockOutTime: string;
  /** 休憩時間（時間）。合計稼働から差し引く */
  breakDurationHours: number;
  totalWorkTime: number;
  tasks: DailyTask[];
  /** SharePoint「現在の手持ち案件」列に JSON 配列で保存 */
  currentProjectLines: ReportProjectLine[];
  /** SharePoint「明日の作業予定」列に JSON 配列で保存 */
  tomorrowLines: ReportProjectLine[];
  summary: string;
  /** Graph createdDateTime（ISO）。初回登録・提出の目安 */
  createdAt: string;
  /** Graph lastModifiedDateTime（ISO）。最終更新 */
  submittedAt: string;
};

export type InstructionProject = {
  projectNumber: string;
  projectName: string;
  taskDetail: string;
};

export type WorkInstruction = {
  id: string;
  adminId: string;
  targetUserId: string;
  /** 紐付け日報（リスト項目 ID）。業務内容 JSON 内にも保存 */
  linkedReportId: string;
  /** 対象日（SharePoint の「対象日」列・YYYY-MM-DD） */
  targetDate: string;
  workStyle: WorkStyle;
  projects: InstructionProject[];
  note: string;
  /** Graph createdDateTime（ISO）。指示日の表示用 */
  createdAt: string;
  /** Graph lastModifiedDateTime（ISO）。更新日の表示用 */
  submittedAt: string;
};

/** Entra ディレクトリ（提出先・指示書の相手先など） */
export type DirectoryUser = {
  id: string;
  displayName: string;
  email: string;
};

/** SharePoint アプリユーザー行（レガシー・未使用でも listItems で参照可） */
export type AppUser = {
  id: string;
  azureAdUserId: string;
  email: string;
  displayName: string;
};
