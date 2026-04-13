"use client";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal/config";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { InteractionStatus } from "@azure/msal-browser";

export function LoginPage() {
  const { instance, inProgress } = useMsal();
  const authed = useIsAuthenticated();
  const router = useRouter();
  const redirected = useRef(false);

  /** リダイレクト／ポップアップ処理が終わってから遷移（HandleRedirect 中に /login へ飛ばさない） */
  useEffect(() => {
    if (
      inProgress === InteractionStatus.Startup ||
      inProgress === InteractionStatus.HandleRedirect
    ) {
      return;
    }
    if (!authed) {
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    router.replace("/dashboard");
  }, [authed, inProgress, router]);

  function login() {
    try {
      void instance.loginRedirect({
        scopes: graphScopes,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          業務報告・指示
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          サインインすると Microsoft の画面に移動し、終わると自動で戻ります。
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          {inProgress === InteractionStatus.HandleRedirect
            ? "サインイン結果を確認しています…"
            : null}
        </p>
        <button
          type="button"
          disabled={
            inProgress === InteractionStatus.HandleRedirect ||
            inProgress === InteractionStatus.Startup
          }
          onClick={() => login()}
          className="mt-6 w-full rounded bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          サインイン
        </button>
      </div>
    </div>
  );
}
