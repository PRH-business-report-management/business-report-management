import { fetchListColumns, type ListColumnMeta } from "./listColumns";
import { getListIdAppUsers, getSharePointSiteId } from "./env";

export type AuFieldKeys = {
  azureAdUserId: string;
  role: string;
};

let cache: { siteId: string; listId: string; keys: AuFieldKeys } | null = null;

/** 開発時に .env を変えたとき用（通常は不要） */
export function clearAuFieldsCache() {
  cache = null;
}

function pickByDisplay(
  columns: ListColumnMeta[],
  labels: string[]
): string | undefined {
  const set = new Set(labels.map((l) => l.trim()));
  for (const c of columns) {
    const d = c.displayName?.trim();
    if (d && set.has(d)) return c.name;
  }
  return undefined;
}

/**
 * Graph の list item fields では「内部名」がキーになる。
 * env で未指定のときは columns API で表示名から内部名を解決する。
 */
export async function getResolvedAuFields(
  accessToken: string
): Promise<AuFieldKeys> {
  const siteId = getSharePointSiteId();
  const listId = getListIdAppUsers();
  if (!listId) {
    throw new Error(
      "SHAREPOINT_LIST_APP_USERS_ID が未設定です。アプリユーザー リストの列解決にはリスト GUID が必要です。"
    );
  }

  if (cache?.siteId === siteId && cache?.listId === listId) {
    return cache.keys;
  }

  const envAzure = process.env.SHAREPOINT_AU_FIELD_AZURE_AD_ID?.trim();
  const envRole = process.env.SHAREPOINT_AU_FIELD_ROLE?.trim();

  if (envAzure && envRole) {
    const keys = { azureAdUserId: envAzure, role: envRole };
    cache = { siteId, listId, keys };
    return keys;
  }

  const columns = await fetchListColumns(accessToken, siteId, listId);

  const azureAdUserId =
    envAzure ||
    pickByDisplay(columns, [
      "ユーザー名",
      "Azure AD Object ID",
      "Object ID",
      "AzureADUserId",
    ]);

  if (!azureAdUserId) {
    throw new Error(
      "アプリユーザー リストに「ユーザー名」相当の列が見つかりません（Graph の columns で表示名を確認してください）。環境変数 SHAREPOINT_AU_FIELD_AZURE_AD_ID に内部名を直接指定することもできます。"
    );
  }

  const role =
    envRole ||
    pickByDisplay(columns, ["権限", "Role", "権限ロール"]);

  if (!role) {
    throw new Error(
      "アプリユーザー リストに「権限」相当の列が見つかりません。SHAREPOINT_AU_FIELD_ROLE に内部名を指定してください。"
    );
  }

  const keys = { azureAdUserId, role };
  cache = { siteId, listId, keys };
  return keys;
}
