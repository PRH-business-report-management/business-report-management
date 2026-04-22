"use client";

import { useMemo } from "react";
import { FieldLabel, fieldSelectClass } from "@/components/ui/FormPrimitives";
import {
  QUARTER_MINUTES,
  joinClockHm,
  shiftHourSelectValues,
  splitClockHm,
  taskHourSelectValues,
} from "@/lib/time/duration";

type Variant = "shift" | "task";

function withExtraOption(allowed: readonly string[], current: string): string[] {
  const c = current?.trim() ?? "";
  if (c && !allowed.includes(c)) {
    return [c, ...allowed];
  }
  return [...allowed];
}

export function TimeHmSelects({
  idPrefix,
  label,
  value,
  onChange,
  variant,
}: {
  idPrefix: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  variant: Variant;
}) {
  const { h: hv, m: mv } = splitClockHm(value);
  const hourPool =
    variant === "shift" ? shiftHourSelectValues() : taskHourSelectValues();
  const hourOptions = useMemo(
    () => withExtraOption(hourPool, hv),
    [hourPool, hv]
  );
  const minuteOptions = useMemo(() => {
    if (hv === "26") return ["00"];
    return withExtraOption(QUARTER_MINUTES as unknown as string[], mv);
  }, [hv, mv]);

  const setPair = (h: string, m: string) => {
    if (!h) {
      onChange("");
      return;
    }
    const safeM = h === "26" ? "00" : m || "00";
    onChange(joinClockHm(h, safeM));
  };

  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={`${idPrefix}-h`}>{label}</FieldLabel>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <select
          id={`${idPrefix}-h`}
          className={`${fieldSelectClass} mt-0 max-w-[6.5rem]`}
          value={hourOptions.includes(hv) ? hv : ""}
          onChange={(e) => {
            const h = e.target.value;
            if (!h) {
              onChange("");
              return;
            }
            const keepQuarter =
              h !== "26" &&
              (QUARTER_MINUTES as readonly string[]).includes(mv);
            const nextM = h === "26" ? "00" : keepQuarter ? mv : "00";
            setPair(h, nextM);
          }}
        >
          <option value="">—</option>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h} 時
            </option>
          ))}
        </select>
        <select
          id={`${idPrefix}-m`}
          className={`${fieldSelectClass} mt-0 max-w-[6.5rem]`}
          value={
            !hv
              ? ""
              : hv === "26"
                ? "00"
                : minuteOptions.includes(mv)
                  ? mv
                  : minuteOptions[0] ?? "00"
          }
          disabled={!hv}
          onChange={(e) => setPair(hv, e.target.value)}
        >
          {!hv ? <option value="">—</option> : null}
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m} 分
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
