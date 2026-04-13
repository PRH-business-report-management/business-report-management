"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore";
import { useEffect } from "react";
import { InteractionStatus } from "@azure/msal-browser";

export default function Home() {
  const authed = useIsAuthenticated();
  const { inProgress } = useMsal();
  const user = useSessionStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (
      inProgress === InteractionStatus.Startup ||
      inProgress === InteractionStatus.HandleRedirect
    ) {
      return;
    }
    if (!authed) {
      router.replace("/login");
      return;
    }
    if (user) router.replace("/dashboard");
  }, [authed, user, router, inProgress]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      読み込み中…
    </div>
  );
}
