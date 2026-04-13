"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReactToPrint } from "react-to-print";
import type { DailyReport, WorkStyle } from "@/types/models";
import { workStyleLabel } from "@/lib/instruction/workStyleLabel";
import { safePdfFilenamePart } from "@/lib/pdf/safePdfFilename";
import {
  isValidShiftClockHm,
  minutesBetween,
  minutesToHoursDecimal,
  quarterHourSelectOptions,
  shiftQuarterSelectOptions,
} from "@/lib/time/duration";
import { formatSlashDateTime } from "@/lib/time/formatJa";
import { DailyReportPrintDocument } from "./DailyReportPrintDocument";
import {
  FieldError,
  FieldLabel,
  FormActions,
  FormSection,
  FormShell,
  PrimaryButton,
  SecondaryButton,
  fieldInputClass,
  fieldInputMultilineClass,
  fieldSelectClass,
  fieldTextareaClass,
} from "@/components/ui/FormPrimitives";

const taskSchema = z.object({
  projectNumber: z.string(),
  projectName: z.string().min(1, "案件名を入力してください"),
  taskDetail: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 形式（例 09:00）"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm 形式"),
  duration: z.number().min(0),
});

const projectLineSchema = z.object({
  projectNumber: z.string(),
  projectName: z.string(),
  content: z.string(),
});

const optionalClockIn = z
  .string()
  .refine((s) => isValidShiftClockHm(s), "時刻を選んでください");

const optionalClockOut = z
  .string()
  .refine((s) => isValidShiftClockHm(s), "時刻を選んでください");

const schema = z.object({
  date: z.string().min(1, "日付を選んでください"),
  weekday: z.string(),
  workStyle: z.enum(["office", "remote", "direct"]),
  clockInTime: optionalClockIn,
  clockOutTime: optionalClockOut,
  breakDurationHours: z
    .number({ error: "休憩時間は数値で入力してください" })
    .min(0, "0以上")
    .max(24),
  submissionTargetId: z.string().min(1, "提出先を選んでください"),
  tasks: z.array(taskSchema).min(1, "タスクを1件以上入力してください"),
  currentProjectLines: z.array(projectLineSchema).min(1),
  tomorrowLines: z.array(projectLineSchema).min(1),
  summary: z.string(),
  totalWorkTime: z.number(),
});

export type DailyReportFormValues = z.infer<typeof schema>;

function defaultTask() {
  return {
    projectNumber: "",
    projectName: "",
    taskDetail: "",
    startTime: "09:30",
    endTime: "",
    duration: 0,
  };
}

function defaultProjectLine() {
  return { projectNumber: "", projectName: "", content: "" };
}

type UserOption = { id: string; displayName: string; email: string };

export function DailyReportForm({
  initial,
  onSubmit,
  submitting,
  userOptions,
  authorDisplayName = "",
  submitLabel = "保存する",
  formActionsExtra,
  autoSave,
  autoSaveDelayMs = 900,
}: {
  initial?: Partial<DailyReport> | null;
  onSubmit: (values: DailyReportFormValues) => Promise<void>;
  submitting?: boolean;
  /** 提出先（Entra ユーザー一覧） */
  userOptions: UserOption[];
  /** PDF・印刷用の記入者表示名 */
  authorDisplayName?: string;
  /** 送信ボタン文言（編集画面では「更新」など） */
  submitLabel?: string;
  /** 送信の左隣に並べるボタンなど（例: 複製） */
  formActionsExtra?: ReactNode;
  /** 編集画面用: 入力中に自動保存（PATCH） */
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printTitle, setPrintTitle] = useState("");

  const defaults = useMemo(
    () => ({
      date: initial?.date ?? format(new Date(), "yyyy-MM-dd"),
      weekday: initial?.weekday ?? "",
      workStyle: (initial?.workStyle ?? "office") as WorkStyle,
      clockInTime: initial?.clockInTime ?? "09:30",
      clockOutTime: initial?.clockOutTime ?? "18:30",
      breakDurationHours:
        typeof initial?.breakDurationHours === "number" &&
        initial.breakDurationHours >= 0
          ? initial.breakDurationHours
          : 1,
      submissionTargetId: initial?.submissionTargetId ?? "",
      tasks: initial?.tasks?.length ? initial.tasks : [defaultTask()],
      currentProjectLines:
        initial?.currentProjectLines && initial.currentProjectLines.length > 0
          ? initial.currentProjectLines
          : [defaultProjectLine()],
      tomorrowLines:
        initial?.tomorrowLines && initial.tomorrowLines.length > 0
          ? initial.tomorrowLines
          : [defaultProjectLine()],
      summary: initial?.summary ?? "",
      totalWorkTime: initial?.totalWorkTime ?? 0,
    }),
    [initial]
  );

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const autoSaveTimer = useRef<number | null>(null);
  const lastAutoSaved = useRef<string>("");
  useEffect(() => {
    if (!autoSave) return;
    if (!initial?.id || initial.id === "preview") return;
    const sub = form.watch(() => {
      if (submitting) return;
      if (!form.formState.isDirty) return;
      if (autoSaveTimer.current != null) {
        window.clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = window.setTimeout(() => {
        void form.handleSubmit(async (v) => {
          const key = JSON.stringify(v);
          if (key === lastAutoSaved.current) return;
          lastAutoSaved.current = key;
          await onSubmit(v);
        })();
      }, autoSaveDelayMs);
    });
    return () => {
      sub.unsubscribe();
      if (autoSaveTimer.current != null) {
        window.clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [autoSave, autoSaveDelayMs, form, initial?.id, onSubmit, submitting]);

  useEffect(() => {
    const ymd = String(form.getValues("date") || "").slice(0, 10).trim();
    const ymdCompact = ymd ? ymd.replaceAll("-", "") : "draft";
    const author = safePdfFilenamePart(authorDisplayName || "報告者");
    setPrintTitle(`業務報告書_${author}_${ymdCompact}`);
  }, [authorDisplayName, form]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printTitle,
    pageStyle:
      "@page { size: A4; margin: 14mm; } @media print { body { -webkit-print-color-adjust: exact; } }",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  const {
    fields: currentFields,
    append: appendCurrent,
    remove: removeCurrent,
  } = useFieldArray({ control: form.control, name: "currentProjectLines" });

  const {
    fields: tomorrowFields,
    append: appendTomorrow,
    remove: removeTomorrow,
  } = useFieldArray({ control: form.control, name: "tomorrowLines" });

  const dateVal = form.watch("date");
  const watchedTasks = useWatch({ control: form.control, name: "tasks" }) ?? [];
  const watchedBreak = useWatch({
    control: form.control,
    name: "breakDurationHours",
  });
  const watchedClockIn = useWatch({
    control: form.control,
    name: "clockInTime",
  });
  const watchedClockOut = useWatch({
    control: form.control,
    name: "clockOutTime",
  });
  const submissionTargetIdWatch = useWatch({
    control: form.control,
    name: "submissionTargetId",
  });

  const submissionTargetDisplayName = useMemo(() => {
    const id = submissionTargetIdWatch ?? "";
    if (!id) return "";
    return (
      userOptions.find((u) => u.id === id)?.displayName ||
      userOptions.find((u) => u.id === id)?.email ||
      ""
    );
  }, [submissionTargetIdWatch, userOptions]);

  useEffect(() => {
    if (!dateVal) return;
    try {
      const d = new Date(dateVal + "T12:00:00");
      const wk = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] ?? "";
      form.setValue("weekday", wk, {
        shouldValidate: false,
      });
    } catch {
      /* ignore */
    }
  }, [dateVal, form]);

  useEffect(() => {
    if (!watchedTasks.length) return;
    watchedTasks.forEach((t, i) => {
      const start = (t?.startTime ?? "").trim();
      const end = (t?.endTime ?? "").trim();
      if (!isValidShiftClockHm(start) || !isValidShiftClockHm(end)) return;
      const mins = minutesBetween(start, end);
      const cur = form.getValues(`tasks.${i}.duration`);
      if (cur !== mins) {
        form.setValue(`tasks.${i}.duration`, mins, {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: false,
        });
      }
    });
  }, [watchedTasks, form]);

  /** 勤務時間（実働）＝退勤−出社（区間）−休憩（時間） */
  useEffect(() => {
    const cin = (watchedClockIn ?? "").trim();
    const cout = (watchedClockOut ?? "").trim();
    const br =
      typeof watchedBreak === "number" && watchedBreak >= 0 ? watchedBreak : 1;
    let net = 0;
    if (
      cin &&
      cout &&
      isValidShiftClockHm(cin) &&
      isValidShiftClockHm(cout)
    ) {
      const grossMin = minutesBetween(cin, cout);
      const grossHours = minutesToHoursDecimal(grossMin);
      net = Math.max(0, Math.round((grossHours - br) * 1000) / 1000);
    }
    if (form.getValues("totalWorkTime") !== net) {
      form.setValue("totalWorkTime", net, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [watchedClockIn, watchedClockOut, watchedBreak, form]);

  const snapshot: DailyReport = {
    id: initial?.id ?? "preview",
    userId: initial?.userId ?? "",
    submissionTargetId: form.watch("submissionTargetId"),
    date: form.watch("date"),
    weekday: form.watch("weekday"),
    workStyle: form.watch("workStyle"),
    clockInTime: form.watch("clockInTime")?.trim() ?? "",
    clockOutTime: form.watch("clockOutTime")?.trim() ?? "",
    breakDurationHours:
      typeof watchedBreak === "number" && watchedBreak >= 0 ? watchedBreak : 1,
    totalWorkTime: form.watch("totalWorkTime"),
    tasks: form.watch("tasks"),
    currentProjectLines: form.watch("currentProjectLines"),
    tomorrowLines: form.watch("tomorrowLines"),
    summary: form.watch("summary"),
    createdAt: initial?.createdAt ?? "",
    submittedAt: initial?.submittedAt ?? "",
  };

  const errs = form.formState.errors;
  const taskGrossHours = useMemo(() => {
    let sumMin = 0;
    for (const t of watchedTasks) {
      sumMin += minutesBetween(
        t?.startTime ?? "00:00",
        t?.endTime ?? "00:00"
      );
    }
    return minutesToHoursDecimal(sumMin);
  }, [watchedTasks]);

  return (
    <FormShell>
      <form
        onSubmit={form.handleSubmit((v) => void onSubmit(v))}
        className="print:hidden"
        noValidate
      >
        <FormSection
          title="基本情報"
          description="記入者・提出先・報告日を入力します。提出先を選ぶと、その方のダッシュボードに業務報告書提出の通知が表示されます。"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>記入者</FieldLabel>
              <p className="mt-1.5 text-sm text-slate-800">
                {authorDisplayName.trim() || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="submission-target" required>
                提出先
              </FieldLabel>
              <select
                id="submission-target"
                className={fieldSelectClass}
                {...form.register("submissionTargetId")}
              >
                <option value="">選んでください</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email || u.id}
                    {u.email ? `（${u.email}）` : ""}
                  </option>
                ))}
              </select>
              <FieldError message={errs.submissionTargetId?.message} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <FieldLabel htmlFor="report-date" required>
                報告日
              </FieldLabel>
              <input
                id="report-date"
                type="date"
                className={fieldInputClass}
                {...form.register("date")}
              />
              <input type="hidden" {...form.register("weekday")} />
              <FieldError message={errs.date?.message} />
            </div>
            {initial?.id && initial.id !== "preview" ? (
              <div className="sm:col-span-2">
                <FieldLabel>更新日</FieldLabel>
                <p className="mt-1.5 text-sm text-slate-800">
                  {initial.submittedAt
                    ? formatSlashDateTime(initial.submittedAt)
                    : "—"}
                </p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="report-work-style">勤務形態</FieldLabel>
              <select
                id="report-work-style"
                className={fieldSelectClass}
                {...form.register("workStyle")}
              >
                <option value="office">{workStyleLabel("office")}</option>
                <option value="remote">{workStyleLabel("remote")}</option>
                <option value="direct">{workStyleLabel("direct")}</option>
              </select>
              <FieldError message={errs.workStyle?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="clock-in">出社時間</FieldLabel>
              <select
                id="clock-in"
                className={fieldSelectClass}
                {...form.register("clockInTime")}
              >
                <option value="">—</option>
                {shiftQuarterSelectOptions(form.watch("clockInTime") ?? "").map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </select>
              <FieldError message={errs.clockInTime?.message as string} />
            </div>
            <div>
              <FieldLabel htmlFor="clock-out">退勤時間</FieldLabel>
              <select
                id="clock-out"
                className={fieldSelectClass}
                {...form.register("clockOutTime")}
              >
                <option value="">—</option>
                {shiftQuarterSelectOptions(
                  form.watch("clockOutTime") ?? ""
                ).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <FieldError message={errs.clockOutTime?.message as string} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="break-hours">休憩時間（時間）</FieldLabel>
              <input
                id="break-hours"
                type="number"
                min={0}
                max={24}
                step={0.25}
                className={fieldInputClass}
                {...form.register("breakDurationHours", {
                  valueAsNumber: true,
                })}
              />
              <FieldError message={errs.breakDurationHours?.message as string} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="本日の業務内容"
          description="案件ごとに作業時間を入力します。タスク行の稼働は開始・終了から算出します。"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => append(defaultTask())}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ＋ 行を追加
            </button>
          </div>
          <FieldError message={errs.tasks?.message} />
          <div className="space-y-4">
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="mb-4 text-sm font-semibold text-blue-600">
                  タスク {i + 1}
                </p>
                <div className="flex flex-col gap-4">
                  {/* 1行目: 番号 | 案件名 */}
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(5.5rem,7rem)_1fr]">
                    <div className="min-w-0">
                      <FieldLabel className="whitespace-nowrap">
                        番号
                      </FieldLabel>
                      <input
                        maxLength={8}
                        className={`${fieldInputClass} w-full max-w-[7rem] px-2 text-center text-sm`}
                        {...form.register(`tasks.${i}.projectNumber`)}
                      />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel required>案件名</FieldLabel>
                      <textarea
                        rows={2}
                        className={fieldInputMultilineClass}
                        {...form.register(`tasks.${i}.projectName`)}
                      />
                      <FieldError
                        message={
                          errs.tasks?.[i]?.projectName?.message as
                            | string
                            | undefined
                        }
                      />
                    </div>
                  </div>
                  {/* 2行目: 開始 · 終了 · 稼働 */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0">
                      <FieldLabel>開始</FieldLabel>
                      <select
                        className={fieldSelectClass}
                        {...form.register(`tasks.${i}.startTime`)}
                      >
                        {quarterHourSelectOptions(
                          form.watch(`tasks.${i}.startTime`) ?? ""
                        ).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <FieldError
                        message={
                          errs.tasks?.[i]?.startTime?.message as
                            | string
                            | undefined
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>終了</FieldLabel>
                      <select
                        className={fieldSelectClass}
                        {...form.register(`tasks.${i}.endTime`)}
                      >
                        {quarterHourSelectOptions(
                          form.watch(`tasks.${i}.endTime`) ?? ""
                        ).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <FieldError
                        message={
                          errs.tasks?.[i]?.endTime?.message as
                            | string
                            | undefined
                        }
                      />
                    </div>
                    <div className="flex flex-col sm:min-w-[6rem]">
                      <span className="text-xs text-slate-500">稼働</span>
                      <span className="text-lg font-semibold tabular-nums text-slate-800">
                        {minutesToHoursDecimal(watchedTasks[i]?.duration ?? 0)}
                        <span className="ml-0.5 text-sm font-normal">h</span>
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          className="mt-2 text-left text-xs text-red-600 hover:underline sm:whitespace-nowrap"
                          onClick={() => remove(i)}
                        >
                          この行を削除
                        </button>
                      )}
                    </div>
                  </div>
                  {/* 3行目: 内容 */}
                  <div className="min-w-0">
                    <FieldLabel>内容</FieldLabel>
                    <textarea
                      rows={5}
                      className={fieldTextareaClass}
                      {...form.register(`tasks.${i}.taskDetail`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-lg bg-blue-50/80 px-4 py-3 text-slate-800">
            <div className="flex justify-between text-sm">
              <span>タスク合計（稼働）</span>
              <span className="tabular-nums font-medium">
                {taskGrossHours}
                <span className="ml-0.5 font-normal">h</span>
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>休憩</span>
              <span className="tabular-nums font-medium">
                {typeof watchedBreak === "number" && watchedBreak >= 0
                  ? watchedBreak
                  : 1}
                <span className="ml-0.5 font-normal">h</span>
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="現在の手持ち案件"
          description="番号・案件名・内容を行で追加できます。"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => appendCurrent(defaultProjectLine())}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ＋ 行を追加
            </button>
          </div>
          <FieldError message={errs.currentProjectLines?.message as string} />
          <div className="space-y-4">
            {currentFields.map((f, i) => (
              <div
                key={f.id}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="mb-4 text-sm font-semibold text-slate-600">
                  行 {i + 1}
                </p>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(5.5rem,7rem)_1fr]">
                    <div className="min-w-0">
                      <FieldLabel className="whitespace-nowrap">
                        番号
                      </FieldLabel>
                      <input
                        maxLength={8}
                        className={`${fieldInputClass} w-full max-w-[7rem] px-2 text-center text-sm`}
                        {...form.register(`currentProjectLines.${i}.projectNumber`)}
                      />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>案件名</FieldLabel>
                      <textarea
                        rows={2}
                        className={fieldInputMultilineClass}
                        {...form.register(`currentProjectLines.${i}.projectName`)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <FieldLabel>内容</FieldLabel>
                    <textarea
                      rows={5}
                      className={fieldTextareaClass}
                      {...form.register(`currentProjectLines.${i}.content`)}
                    />
                  </div>
                  {currentFields.length > 1 && (
                    <div>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => removeCurrent(i)}
                      >
                        この行を削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="明日の作業予定"
          description="番号・案件名・内容を行で追加できます。"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => appendTomorrow(defaultProjectLine())}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ＋ 行を追加
            </button>
          </div>
          <FieldError message={errs.tomorrowLines?.message as string} />
          <div className="space-y-4">
            {tomorrowFields.map((f, i) => (
              <div
                key={f.id}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="mb-4 text-sm font-semibold text-slate-600">
                  行 {i + 1}
                </p>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(5.5rem,7rem)_1fr]">
                    <div className="min-w-0">
                      <FieldLabel className="whitespace-nowrap">
                        番号
                      </FieldLabel>
                      <input
                        maxLength={8}
                        className={`${fieldInputClass} w-full max-w-[7rem] px-2 text-center text-sm`}
                        {...form.register(`tomorrowLines.${i}.projectNumber`)}
                      />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>案件名</FieldLabel>
                      <textarea
                        rows={2}
                        className={fieldInputMultilineClass}
                        {...form.register(`tomorrowLines.${i}.projectName`)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <FieldLabel>内容</FieldLabel>
                    <textarea
                      rows={5}
                      className={fieldTextareaClass}
                      {...form.register(`tomorrowLines.${i}.content`)}
                    />
                  </div>
                  {tomorrowFields.length > 1 && (
                    <div>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => removeTomorrow(i)}
                      >
                        この行を削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="備考（成果・問題・改善点）"
          description="業務上の成果、課題、次に試したい改善などを自由に記入してください。"
        >
          <div>
            <FieldLabel>内容</FieldLabel>
            <textarea
              rows={5}
              className={fieldTextareaClass}
              {...form.register("summary")}
            />
          </div>
        </FormSection>

        <FormActions>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "保存中…" : submitLabel}
          </PrimaryButton>
          {formActionsExtra}
          <SecondaryButton onClick={() => handlePrint()}>印刷</SecondaryButton>
        </FormActions>
      </form>

      <div
        className="pointer-events-none absolute -left-[9999px] top-0 w-[210mm] bg-white p-4 text-black"
        aria-hidden
      >
        <DailyReportPrintDocument
          report={snapshot}
          contentRef={printRef}
          authorName={authorDisplayName}
          submissionTargetName={submissionTargetDisplayName}
        />
      </div>
    </FormShell>
  );
}
