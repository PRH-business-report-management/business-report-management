import { format, parseISO } from "date-fns";
import type { DailyReport } from "@/types/models";

const WEEKDAY_KANJI = ["日", "月", "火", "水", "木", "金", "土"] as const;

function weekdayKanji(d: Date): string {
  return WEEKDAY_KANJI[d.getDay()] ?? "";
}

/**
 * yyyy/MM/dd（曜）HH:mm（「年月日」漢字なし）
 * - 日付のみ（yyyy-MM-dd）→ 時刻 00:00
 * - ISO → ローカルでその瞬間
 */
/**
 * 一覧の「報告日」用: 業務日付（date）に、初回作成時刻（createdAt）の時分秒を合わせる。
 * createdAt が無い場合は date の 00:00。
 */
export function formatReportBusinessDateTime(r: Pick<DailyReport, "date" | "createdAt">): string {
  const d = r.date?.slice(0, 10);
  if (!d || d.length < 10) return "—";
  const created = r.createdAt?.trim();
  if (!created) return formatSlashDateTime(`${d}T00:00:00`);
  try {
    const ct = parseISO(created);
    if (Number.isNaN(ct.getTime())) return formatSlashDateTime(`${d}T00:00:00`);
    const bd = parseISO(`${d}T12:00:00`);
    if (Number.isNaN(bd.getTime())) return formatSlashDateTime(`${d}T00:00:00`);
    const merged = new Date(
      bd.getFullYear(),
      bd.getMonth(),
      bd.getDate(),
      ct.getHours(),
      ct.getMinutes(),
      ct.getSeconds(),
      ct.getMilliseconds()
    );
    return `${format(merged, "yyyy/MM/dd")}（${weekdayKanji(merged)}） ${format(merged, "HH:mm")}`;
  } catch {
    return formatSlashDateTime(`${d}T00:00:00`);
  }
}

/**
 * 一覧の「更新日」列用。作成日時と最終更新が実質同じ（初回保存のみ）のときは空文字を返す。
 */
export function formatListUpdatedAt(createdAt: string, submittedAt: string): string {
  const s = submittedAt?.trim() ?? "";
  const c = createdAt?.trim() ?? "";
  if (!s) return "";
  if (!c) return formatSlashDateTime(s);
  const ct = Date.parse(c);
  const st = Date.parse(s);
  if (!Number.isFinite(st)) return "";
  if (!Number.isFinite(ct)) return formatSlashDateTime(s);
  // 同一タイムスタンプ付近（2 秒以内）は未更新扱い
  if (st <= ct + 2000) return "";
  return formatSlashDateTime(s);
}

export function formatSlashDateTime(isoOrYmd: string): string {
  if (!isoOrYmd?.trim()) return "—";
  const s = isoOrYmd.trim();
  try {
    const d =
      s.length <= 10
        ? parseISO(`${s.slice(0, 10)}T00:00:00`)
        : parseISO(s);
    if (Number.isNaN(d.getTime())) return s;
    return `${format(d, "yyyy/MM/dd")}（${weekdayKanji(d)}） ${format(d, "HH:mm")}`;
  } catch {
    return s;
  }
}

/** 日付部分のみ yyyy/MM/dd（曜）（時刻を出さないとき） */
export function formatSlashDate(ymdOrIso: string): string {
  if (!ymdOrIso?.trim()) return "";
  const s = ymdOrIso.trim();
  try {
    const d = parseISO(s.length <= 10 ? `${s.slice(0, 10)}T12:00:00` : s);
    if (Number.isNaN(d.getTime())) return s;
    return `${format(d, "yyyy/MM/dd")}（${weekdayKanji(d)}）`;
  } catch {
    return ymdOrIso;
  }
}

/**
 * @deprecated `formatSlashDate` または `formatSlashDateTime` を使ってください
 */
export function formatDateJa(ymdOrIso: string): string {
  return formatSlashDate(ymdOrIso);
}

/**
 * @deprecated `formatSlashDateTime` と同じ（空のときは "—"）
 */
export function formatDateTimeJa(iso: string): string {
  return formatSlashDateTime(iso);
}

/** @deprecated `formatSlashDate` を使用 */
export function formatYmdWithWeekdayJa(ymd: string): string {
  return formatSlashDate(ymd);
}

/** @deprecated `formatSlashDateTime` を使用 */
export function formatIsoWithWeekdayAndTimeJa(iso: string): string {
  return formatSlashDateTime(iso);
}

/** @deprecated `formatSlashDateTime` のエイリアス */
export const formatDashboardSlashDateTime = formatSlashDateTime;

/**
 * 日本の会計年度（4月始まり）の年数。
 * 4〜12月は当該暦年、1〜3月は「前の暦年」を年度とする。
 */
export function fiscalYearJaFromYmd(ymd: string): number {
  if (!ymd?.trim()) return 0;
  const y = Number.parseInt(ymd.slice(0, 4), 10);
  const m = Number.parseInt(ymd.slice(5, 7), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 0;
  return m >= 4 ? y : y - 1;
}

/** 一覧表示用（0 のときは "—" を想定して呼び出し側で処理） */
export function formatFiscalYearJaLabel(fy: number): string {
  if (!Number.isFinite(fy) || fy <= 0) return "—";
  return `${fy}年度`;
}
