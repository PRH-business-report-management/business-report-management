import type { WorkStyle } from "@/types/models";

export function workStyleLabel(ws: WorkStyle): string {
  if (ws === "remote") return "テレワーク";
  if (ws === "direct") return "直行";
  return "出社";
}

/** API / フォームから WorkStyle を正規化 */
export function parseWorkStyleInput(v: unknown): WorkStyle {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "remote" || s === "リモート" || s === "在宅" || s === "テレワーク")
    return "remote";
  if (s === "direct" || s === "直行") return "direct";
  return "office";
}
