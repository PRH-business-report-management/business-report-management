/** API リクエストヘッダー（開発用・本番では解釈しない） */
export const DEV_IMPERSONATE_HEADER = "x-dev-impersonate-user-id";

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** サーバー: なりすましヘッダーを解釈するか */
export function isDevImpersonationAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_IMPERSONATION === "true"
  );
}

/** クライアント: なりすましヘッダーを付与するか（ビルド時に埋め込み） */
export function clientMaySendImpersonationHeader(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ALLOW_DEV_IMPERSONATION === "true"
  );
}

export function parseImpersonationHeader(req: Request): string | null {
  if (!isDevImpersonationAllowed()) return null;
  const raw = req.headers.get(DEV_IMPERSONATE_HEADER)?.trim();
  if (!raw || !GUID_RE.test(raw)) return null;
  return raw;
}
