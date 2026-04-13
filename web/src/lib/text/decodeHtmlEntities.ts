/** SharePoint 等が HTML エンコードした JSON 文字列をパース可能にする */
export function decodeHtmlEntities(input: string): string {
  if (input == null || typeof input !== "string") return "";
  let s = input;
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/&apos;/g, "'");
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&lt;/g, "<");
  s = s.replace(/&gt;/g, ">");
  s = s.replace(/&#(\d+);/g, (_, n) => {
    const code = Number.parseInt(n, 10);
    return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
  });
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
    const code = Number.parseInt(h, 16);
    return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
  });
  return s;
}
