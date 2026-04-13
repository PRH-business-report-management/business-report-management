/** Windows / ブラウザで問題になりがちな文字を除いたファイル名用フラグメント */
export function safePdfFilenamePart(raw: string): string {
  const t = raw
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return t.slice(0, 80) || "名称未設定";
}
