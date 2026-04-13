/** 出社・退勤用: 06:00〜26:00 を15分刻み（26時台は 26:00 のみ） */
export const SHIFT_QUARTER_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let mins = 6 * 60; mins <= 26 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 26 && m > 0) continue;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
})();

/** 00:00〜23:45 を15分刻みで列挙 */
export const TIME_QUARTER_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
    }
  }
  return out;
})();

/** 深夜帯の退勤（翌日0〜2時）を 24:00〜26:00 で表す（15分刻み） */
export const LATE_NIGHT_CLOCK_OUT_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let mins = 24 * 60; mins <= 26 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
})();

const ALL_CLOCK_OUT_OPTIONS = new Set([
  ...TIME_QUARTER_OPTIONS,
  ...LATE_NIGHT_CLOCK_OUT_OPTIONS,
]);

const SHIFT_OPTIONS_SET = new Set(SHIFT_QUARTER_OPTIONS);

export function isValidShiftClockHm(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (SHIFT_OPTIONS_SET.has(t)) return true;
  return /^([01]\d|2[0-6]):[0-5]\d$/.test(t);
}

export function isValidClockOutHm(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (SHIFT_OPTIONS_SET.has(t)) return true;
  if (ALL_CLOCK_OUT_OPTIONS.has(t)) return true;
  return /^([01]\d|2[0-6]):[0-5]\d$/.test(t);
}

/** 出社・退勤のドロップダウン（6:00〜26:00） / 未登録値は先頭に追加 */
export function shiftQuarterSelectOptions(current: string): string[] {
  return optionsWithValue(SHIFT_QUARTER_OPTIONS, current);
}

/** 退勤時間用ドロップダウン（24:00〜26:00 を含む） */
export function clockOutQuarterSelectOptions(current: string): string[] {
  return shiftQuarterSelectOptions(current);
}

function optionsWithValue(allowed: readonly string[], value: string): string[] {
  const v = value?.trim() ?? "";
  if (v && !allowed.includes(v)) {
    return [v, ...allowed];
  }
  return [...allowed];
}

/** ドロップダウン用（未登録の時刻があれば先頭に足す） */
export function quarterHourSelectOptions(current: string): string[] {
  return optionsWithValue(TIME_QUARTER_OPTIONS, current);
}

/** "HH:mm" を分に変換 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesBetween(start: string, end: string): number {
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (b < a) return 0;
  return b - a;
}

export function minutesToHoursDecimal(mins: number): number {
  return Math.round((mins / 60) * 100) / 100;
}
