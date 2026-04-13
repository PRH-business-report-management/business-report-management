import { create } from "zustand";

export type SessionUser = {
  id: string;
  displayName?: string;
  email?: string;
};

/** 開発用: 実ログインユーザー（API の dev 応答から） */
export type DevImpersonationInfo = {
  actualUserId: string;
  actualDisplayName?: string;
};

type SessionState = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  sessionError: string | null;
  setSessionError: (msg: string | null) => void;
  /** 付与する X-Dev-Impersonate-User-Id（空で解除） */
  impersonateUserId: string | null;
  setImpersonateUserId: (id: string | null) => void;
  devImpersonation: DevImpersonationInfo | null;
  setDevImpersonation: (v: DevImpersonationInfo | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  sessionError: null,
  setSessionError: (sessionError) => set({ sessionError }),
  impersonateUserId: null,
  setImpersonateUserId: (impersonateUserId) => set({ impersonateUserId }),
  devImpersonation: null,
  setDevImpersonation: (devImpersonation) => set({ devImpersonation }),
}));
