/** SharePoint 由来の HTML ラッパー（ExternalClass 等）を除き、表示用のプレーンテキストに近づける */
export function stripSharePointHtml(raw: string): string {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw;
  s = s.replace(/<div[^>]*class="[^"]*ExternalClass[^"]*"[^>]*>/gi, "");
  s = s.replace(/<\/div>/gi, "\n");
  s = s.replace(/<p[^>]*>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number.parseInt(n, 10);
      return Number.isFinite(code) && code > 0
        ? String.fromCharCode(code)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) && code > 0
        ? String.fromCharCode(code)
        : "";
    });
  return s.replace(/\n{3,}/g, "\n\n").trim();
}
