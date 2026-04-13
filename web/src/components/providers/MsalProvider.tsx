"use client";

import {
  PublicClientApplication,
  EventType,
  type AccountInfo,
} from "@azure/msal-browser";
import { MsalProvider as MsalProviderBase } from "@azure/msal-react";
import { buildMsalConfig } from "@/lib/msal/config";
import { useMemo, type ReactNode } from "react";

function createMsal() {
  const instance = new PublicClientApplication(buildMsalConfig());
  instance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const account = event.payload as AccountInfo;
      instance.setActiveAccount(account);
    }
  });
  return instance;
}

/**
 * msal-react の MsalProvider は内部で initialize() と handleRedirectPromise() を実行する。
 * ここで二重に initialize しない（ポップアップ／リダイレクトの不具合の原因になる）。
 */
export function MsalProvider({ children }: { children: ReactNode }) {
  const instance = useMemo(() => createMsal(), []);

  return <MsalProviderBase instance={instance}>{children}</MsalProviderBase>;
}
