export function formatReportNumber(id: string): string {
  return formatPrefixedNumber("R", id);
}

export function formatInstructionNumber(id: string): string {
  return formatPrefixedNumber("I", id);
}

function formatPrefixedNumber(prefix: "R" | "I", rawId: string): string {
  const s = String(rawId ?? "").trim();
  if (!s) return `${prefix}_—`;
  const n = Number.parseInt(s, 10);
  if (Number.isFinite(n) && String(n) === s.replace(/^0+/, "")?.trim()) {
    return `${prefix}_${n}`;
  }
  return `${prefix}_${s}`;
}

