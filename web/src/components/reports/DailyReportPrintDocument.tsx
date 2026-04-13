"use client";

import { workStyleLabel } from "@/lib/instruction/workStyleLabel";
import { minutesToHoursDecimal } from "@/lib/time/duration";
import {
  formatReportBusinessDateTime,
  formatSlashDateTime,
} from "@/lib/time/formatJa";
import type { DailyReport, ReportProjectLine } from "@/types/models";
import { ReportDocumentIcon } from "@/components/ui/DocumentTypeIcons";
import type { CSSProperties, RefObject } from "react";
import { formatReportNumber } from "@/lib/serial/documentNumber";

const rootStyle: CSSProperties = {
  width: "100%",
  maxWidth: "190mm",
  margin: "0 auto",
  boxSizing: "border-box",
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
  fontSize: "11pt",
  lineHeight: 1.6,
  color: "#111827",
  wordBreak: "break-word",
};

const sectionStyle: CSSProperties = {
  marginBottom: "12px",
};

const avoidInsideStyle: CSSProperties = {
  pageBreakInside: "avoid",
  breakInside: "avoid",
};

const heading2Style: CSSProperties = {
  fontSize: "10.5pt",
  fontWeight: 600,
  borderBottom: "1px solid #d4d4d8",
  marginBottom: "6px",
  paddingBottom: "4px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  fontSize: "10pt",
  pageBreakInside: "auto",
};

const cellBorder: CSSProperties = {
  borderBottom: "1px solid #e4e4e7",
  padding: "6px 5px",
  verticalAlign: "top",
  overflowWrap: "anywhere",
};

const cellTextBlockStyle: CSSProperties = {
  display: "block",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const headerMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 120px 1fr",
  border: "1px solid #d4d4d8",
  borderRadius: "8px",
  overflow: "hidden",
  background: "#ffffff",
  fontSize: "10pt",
  lineHeight: 1.5,
};

const headerMetaLabelStyle: CSSProperties = {
  padding: "6px 8px",
  background: "#f4f4f5",
  borderRight: "1px solid #d4d4d8",
  borderBottom: "1px solid #d4d4d8",
  fontWeight: 600,
  color: "#111827",
};

const headerMetaValueStyle: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #d4d4d8",
  color: "#111827",
  overflowWrap: "anywhere",
};

function LinesTable({ lines }: { lines: ReportProjectLine[] }) {
  if (!lines?.length) {
    return <p style={{ fontSize: "10pt", color: "#71717a" }}>—</p>;
  }
  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: "12%" }} />
        <col style={{ width: "28%" }} />
        <col style={{ width: "60%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...cellBorder, textAlign: "left" }}>番号</th>
          <th style={{ ...cellBorder, textAlign: "left" }}>案件名</th>
          <th style={{ ...cellBorder, textAlign: "left" }}>内容</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i}>
            <td style={cellBorder}>{l.projectNumber || "—"}</td>
            <td style={cellBorder}>{l.projectName || "—"}</td>
            <td style={cellBorder}>
              <div style={cellTextBlockStyle}>{l.content}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyReportPrintDocument({
  report,
  contentRef,
  authorName,
  submissionTargetName,
}: {
  report: DailyReport;
  contentRef: RefObject<HTMLDivElement | null>;
  authorName: string;
  submissionTargetName: string;
}) {
  const gross = report.tasks.reduce(
    (acc, t) => acc + minutesToHoursDecimal(t.duration),
    0
  );
  const br =
    typeof report.breakDurationHours === "number" && report.breakDurationHours >= 0
      ? report.breakDurationHours
      : 1;

  const reportDay = formatReportBusinessDateTime(report);
  const style = workStyleLabel(report.workStyle ?? "office");
  const reportNo = formatReportNumber(report.id);

  return (
    <div ref={contentRef} className="print-root" style={rootStyle}>
      <header
        style={{
          ...sectionStyle,
          ...avoidInsideStyle,
          position: "relative",
          borderBottom: "1px solid #d4d4d8",
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            fontSize: "10pt",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {reportNo}
        </div>
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14pt",
            fontWeight: 700,
            margin: "0 0 8px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              color: "#0284c7",
              flexShrink: 0,
            }}
            aria-hidden
          >
            <ReportDocumentIcon title="" width={22} height={22} />
          </span>
          業務報告書
        </h1>
        <div style={{ fontSize: "10pt", lineHeight: 1.5 }}>
          <div>
            <span style={{ fontWeight: 600 }}>記入者:</span>{" "}
            {authorName.trim() || "—"}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>提出先:</span>{" "}
            {submissionTargetName.trim() || "—"}
          </div>
          {report.submittedAt ? (
            <div>
              <span style={{ fontWeight: 600 }}>更新日:</span>{" "}
              {formatSlashDateTime(report.submittedAt)}
            </div>
          ) : null}
        </div>
        <div style={{ marginTop: "10px" }}>
          <div style={headerMetaGridStyle}>
            <div style={headerMetaLabelStyle}>報告日</div>
            <div style={headerMetaValueStyle}>{reportDay}</div>
            <div style={headerMetaLabelStyle}>勤務形態</div>
            <div style={headerMetaValueStyle}>{style}</div>

            <div style={headerMetaLabelStyle}>タスク合計</div>
            <div style={headerMetaValueStyle}>{gross} 時間</div>
            <div style={headerMetaLabelStyle}>休憩</div>
            <div style={headerMetaValueStyle}>{br} 時間</div>

            <div style={headerMetaLabelStyle}>勤務時間（実働）</div>
            <div style={headerMetaValueStyle}>{report.totalWorkTime} 時間</div>
            <div style={headerMetaLabelStyle}>出社 / 退勤</div>
            <div style={headerMetaValueStyle}>
              {report.clockInTime || "—"} / {report.clockOutTime || "—"}
            </div>
          </div>
        </div>
      </header>

      <section style={sectionStyle}>
        <h2 style={heading2Style}>作業内容</h2>
        <table style={tableStyle}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...cellBorder, textAlign: "left" }}>番号</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>案件名</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>内容</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>開始</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>終了</th>
              <th style={{ ...cellBorder, textAlign: "right" }}>稼働</th>
            </tr>
          </thead>
          <tbody>
            {report.tasks.map((t, i) => (
              <tr key={i}>
                <td style={cellBorder}>{t.projectNumber || "—"}</td>
                <td style={cellBorder}>{t.projectName}</td>
                <td style={cellBorder}>
                  <div style={cellTextBlockStyle}>{t.taskDetail}</div>
                </td>
                <td style={cellBorder}>{t.startTime}</td>
                <td style={cellBorder}>{t.endTime}</td>
                <td style={{ ...cellBorder, textAlign: "right" }}>
                  {minutesToHoursDecimal(t.duration)} h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="avoid-break" style={{ ...sectionStyle, ...avoidInsideStyle }}>
        <h2 style={heading2Style}>現在の手持ち案件</h2>
        <LinesTable lines={report.currentProjectLines ?? []} />
      </section>

      <section className="avoid-break" style={{ ...sectionStyle, ...avoidInsideStyle }}>
        <h2 style={heading2Style}>明日の予定</h2>
        <LinesTable lines={report.tomorrowLines ?? []} />
      </section>

      <section style={{ ...sectionStyle, ...avoidInsideStyle }}>
        <h2 style={heading2Style}>成果・問題・改善点</h2>
        <p style={{ fontSize: "10pt", margin: 0, whiteSpace: "pre-wrap" }}>
          {report.summary}
        </p>
      </section>
    </div>
  );
}
