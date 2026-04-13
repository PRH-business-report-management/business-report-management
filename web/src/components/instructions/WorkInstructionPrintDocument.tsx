"use client";

import { workStyleLabel } from "@/lib/instruction/workStyleLabel";
import { formatSlashDate, formatSlashDateTime } from "@/lib/time/formatJa";
import type { WorkInstruction } from "@/types/models";
import { InstructionDocumentIcon } from "@/components/ui/DocumentTypeIcons";
import type { CSSProperties, RefObject } from "react";
import { formatInstructionNumber } from "@/lib/serial/documentNumber";

const rootStyle: CSSProperties = {
  width: "100%",
  maxWidth: "190mm",
  margin: "0 auto",
  boxSizing: "border-box",
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
  fontSize: "11pt",
  lineHeight: 1.45,
  color: "#111827",
  wordBreak: "break-word",
};

/** 表などで長くなっても html2pdf が末尾を切らないよう、本文ブロックは分割を許可する */
const blockStyle: CSSProperties = {
  marginBottom: "12px",
};

const headerSectionStyle: CSSProperties = {
  marginBottom: "12px",
  pageBreakInside: "avoid",
  breakInside: "avoid",
  borderBottom: "1px solid #d4d4d8",
  paddingBottom: "10px",
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
  padding: "5px 4px",
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

const headerMetaLabelStyleNoBottom: CSSProperties = {
  ...headerMetaLabelStyle,
  borderBottom: "0",
};

const headerMetaValueStyleNoBottom: CSSProperties = {
  ...headerMetaValueStyle,
  borderBottom: "0",
};

export function WorkInstructionPrintDocument({
  instruction,
  notePlain,
  contentRef,
  instructorName,
  assigneeName,
}: {
  instruction: WorkInstruction;
  /** フォーム入力中の備考を優先（PDF／印刷で確実に反映） */
  notePlain?: string;
  contentRef: RefObject<HTMLDivElement | null>;
  instructorName: string;
  assigneeName: string;
}) {
  const styleLabel = workStyleLabel(instruction.workStyle);
  const dateLine = instruction.targetDate
    ? formatSlashDate(instruction.targetDate)
    : "—";
  const instrNo = formatInstructionNumber(instruction.id);
  const issuedAt = instruction.createdAt
    ? formatSlashDateTime(instruction.createdAt)
    : "—";

  const noteText = String(notePlain ?? instruction.note ?? "").trim();

  return (
    <div ref={contentRef} className="print-root" style={rootStyle}>
      <header style={{ ...headerSectionStyle, position: "relative" }}>
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
          {instrNo}
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
              color: "#d97706",
              flexShrink: 0,
            }}
            aria-hidden
          >
            <InstructionDocumentIcon title="" width={22} height={22} />
          </span>
          業務指示書
        </h1>
        <div style={{ fontSize: "10pt", lineHeight: 1.5 }}>
          <div>
            <span style={{ fontWeight: 600 }}>指示者:</span>{" "}
            {instructorName.trim() || "—"}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>対象者:</span>{" "}
            {assigneeName.trim() || "—"}
          </div>
        </div>
        <div style={{ marginTop: "10px" }}>
          <div style={headerMetaGridStyle}>
            <div style={headerMetaLabelStyle}>対象日</div>
            <div style={headerMetaValueStyle}>{dateLine}</div>
            <div style={headerMetaLabelStyle}>指示日</div>
            <div style={headerMetaValueStyle}>{issuedAt}</div>

            <div style={headerMetaLabelStyleNoBottom}>勤務形態</div>
            <div style={headerMetaValueStyleNoBottom}>{styleLabel}</div>
            <div style={headerMetaLabelStyleNoBottom}> </div>
            <div style={headerMetaValueStyleNoBottom}> </div>
          </div>
        </div>
      </header>

      <section style={blockStyle}>
        <h2 style={heading2Style}>指示内容</h2>
        <table style={tableStyle}>
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "60%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...cellBorder, textAlign: "left" }}>番号</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>名称</th>
              <th style={{ ...cellBorder, textAlign: "left" }}>詳細</th>
            </tr>
          </thead>
          <tbody>
            {instruction.projects.map((p, i) => (
              <tr key={i}>
                <td style={cellBorder}>{p.projectNumber || "—"}</td>
                <td style={cellBorder}>{p.projectName}</td>
                <td style={cellBorder}>
                  <div style={cellTextBlockStyle}>{p.taskDetail}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ ...blockStyle, overflow: "visible" }}>
        <h2 style={heading2Style}>備考</h2>
        <div
          style={{
            fontSize: "10pt",
            margin: 0,
            padding: "6px 0",
            color: "#111827",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            overflow: "visible",
            maxHeight: "none",
            minHeight: "1.35em",
            pageBreakInside: "auto",
          }}
        >
          {noteText.length > 0 ? noteText : "—"}
        </div>
      </section>
    </div>
  );
}
