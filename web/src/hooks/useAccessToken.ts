"use client";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { graphScopes } from "@/lib/msal/config";
import { useCallback, useRef } from "react";

/** 同時に複数の acquireTokenPopup が開かないようにする */
let popupInteraction: Promise<string> | null = null;

export function useAccessToken() {
  const { instance, accounts } = useMsal();
  const authenticated = useIsAuthenticated();
  const accountId = accounts[0]?.localAccountId ?? "";

  const getToken = useCallback(async () => {
    if (!authenticated || !accounts[0]) return null;
    const request = {
      scopes: graphScopes,
      account: accounts[0],
    };
    try {
      const res = await instance.acquireTokenSilent(request);
      return res.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        if (popupInteraction) {
          return popupInteraction;
        }
        popupInteraction = (async () => {
          try {
            const res = await instance.acquireTokenPopup(request);
            return res.accessToken;
          } finally {
            popupInteraction = null;
          }
        })();
        return popupInteraction;
      }
      throw e;
    }
  }, [authenticated, accountId, accounts, instance]);

  return { getToken, authenticated, account: accounts[0] ?? null };
}
