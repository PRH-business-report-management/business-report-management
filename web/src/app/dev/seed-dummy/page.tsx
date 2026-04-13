"use client";

import { useState } from "react";
import Link from "next/link";
import { useIsAuthenticated } from "@azure/msal-react";
import { useAccessToken } from "@/hooks/useAccessToken";
import { authenticatedFetch } from "@/lib/api/authenticatedFetch";

export default function SeedDummyPage() {
  const msalAuthed = useIsAuthenticated();
  const { getToken } = useAccessToken();
  const [igarashiId, setIgarashiId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthText, setHealthText] = useState<string | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [colsBusy, setColsBusy] = useState(false);
  const [colsTextDaily, setColsTextDaily] = useState<string | null>(null);
  const [colsTextInstr, setColsTextInstr] = useState<string | null>(null);
  const [colsErr, setColsErr] = useState<string | null>(null);

  const isDev =
    typeof process.env.NODE_ENV !== "undefined" &&
    process.env.NODE_ENV === "development";

  async function run() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await authenticatedFetch(getToken, "/api/dev/seed-dummy-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igarashiUserId: igarashiId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "失敗しました");
        return;
      }
      setMsg(
        typeof data.message === "string"
          ? data.message
          : `${data.count ?? 0} 件作成しました`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setBusy(false);
    }
  }

  async function runReportsAndInstructions() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await authenticatedFetch(getToken, "/api/dev/seed-dummy-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igarashiUserId: igarashiId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "失敗しました");
        return;
      }
      setMsg(
        typeof data.message === "string"
          ? data.message
          : `報告書 ${data.reports?.count ?? 0} 件・指示書 ${data.instructions?.count ?? 0} 件`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setBusy(false);
    }
  }

  async function checkHealth() {
    setHealthBusy(true);
    setHealthErr(null);
    setHealthText(null);
    try {
      const res = await authenticatedFetch(getToken, "/api/sharepoint/health");
      const data = await res.json();
      if (!res.ok) {
        setHealthErr(
          typeof data.error === "string" ? data.error : JSON.stringify(data)
        );
        return;
      }
      setHealthText(JSON.stringify(data, null, 2));
    } catch (e) {
      setHealthErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setHealthBusy(false);
    }
  }

  async function fetchColumns(list: "daily" | "instructions") {
    setColsBusy(true);
    setColsErr(null);
    try {
      const res = await authenticatedFetch(
        getToken,
        `/api/sharepoint/columns?list=${list}`
      );
      const data = await res.json();
      if (!res.ok) {
        setColsErr(
          typeof data.error === "string" ? data.error : JSON.stringify(data)
        );
        return;
      }
      const lines = Array.isArray(data.envLines) ? data.envLines : [];
      const note =
        typeof data.note === "string" ? `\n\n# ${data.note}` : "";
      const header =
        list === "daily"
          ? "# 業務報告書: .env.local に貼り付け（SHAREPOINT_DR_FIELD_* ・重複行は置き換え）"
          : "# 業務指示書: .env.local に貼り付け（SHAREPOINT_WI_FIELD_* ・重複行は置き換え）";
      const block = `${header}\n${lines.join("\n")}${note}\n\n# 全列（参照用）\n${JSON.stringify(data.columns, null, 2)}`;
      if (list === "daily") {
        setColsTextDaily(block);
      } else {
        setColsTextInstr(block);
      }
    } catch (e) {
      setColsErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setColsBusy(false);
    }
  }

  if (!isDev) {
    return (
      <div className="mx-auto max-w-lg rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
        <p className="font-medium">このページは開発環境（next dev）でのみ利用できます。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-800">
      {!msalAuthed ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          SharePoint / Graph の操作には{" "}
          <Link href="/login" className="font-medium text-blue-700 underline">
            Microsoft でサインイン
          </Link>
          してください。未ログインのままでは API が「未ログインです」になります。
        </p>
      ) : null}
      <h1 className="text-lg font-semibold">ダミー業務報告書の一括投入（開発用）</h1>
      <section className="rounded border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold text-zinc-800">
          SharePoint 接続確認
        </h2>
        <p className="mt-1 text-xs text-zinc-600">
          サイト ID と業務報告・指示リストへの Graph アクセスを試します（.env.local
          設定後に利用）。
        </p>
        <button
          type="button"
          disabled={healthBusy}
          onClick={() => void checkHealth()}
          className="mt-3 rounded border border-zinc-400 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
        >
          {healthBusy ? "確認中…" : "/api/sharepoint/health を実行"}
        </button>
        {healthErr ? (
          <p className="mt-2 text-sm text-red-600">{healthErr}</p>
        ) : null}
        {healthText ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-2 text-xs text-zinc-800">
            {healthText}
          </pre>
        ) : null}
        <h3 className="mt-4 text-xs font-semibold text-zinc-700">
          列の内部名（Field is not recognized 対策）
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          Graph が返す実際の内部名（name）から、.env 用の行を生成します。Unicode
          の手推測とずれることがあります。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={colsBusy}
            onClick={() => void fetchColumns("daily")}
            className="rounded border border-zinc-400 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
          >
            {colsBusy ? "取得中…" : "業務報告書リストの列を取得"}
          </button>
          <button
            type="button"
            disabled={colsBusy}
            onClick={() => void fetchColumns("instructions")}
            className="rounded border border-zinc-400 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
          >
            {colsBusy ? "取得中…" : "業務指示書リストの列を取得"}
          </button>
        </div>
        {colsErr ? (
          <p className="mt-2 text-sm text-red-600">{colsErr}</p>
        ) : null}
        {colsTextDaily ? (
          <pre className="mt-2 max-h-72 overflow-auto rounded bg-white p-2 text-xs text-zinc-800 whitespace-pre-wrap break-all">
            {colsTextDaily}
          </pre>
        ) : null}
        {colsTextInstr ? (
          <pre className="mt-2 max-h-72 overflow-auto rounded bg-white p-2 text-xs text-zinc-800 whitespace-pre-wrap break-all">
            {colsTextInstr}
          </pre>
        ) : null}
      </section>
      <p className="text-zinc-600">
        下記のオブジェクト ID は、ダミー報告書の「提出先」およびダミー指示書の「対象者」に使います（報告書6件のうち3件の提出先も同じ）。業務指示書の「指示者」は常に
        <strong> 今サインインしているユーザー </strong>です。
      </p>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">
          宛先ユーザーの Azure AD オブジェクト ID（提出先・指示の対象者。省略時は .env の
          SEED_IGARASHI_AAD_ID）
        </span>
        <input
          className="w-full rounded border border-zinc-300 px-2 py-1.5"
          value={igarashiId}
          onChange={(e) => setIgarashiId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runReportsAndInstructions()}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy ? "作成中…" : "報告書6件＋指示書4件をまとめて作成"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="rounded border border-zinc-400 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy ? "作成中…" : "業務報告書のみ6件"}
        </button>
      </div>
      {msg ? <p className="text-green-700">{msg}</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
    </div>
  );
}
