import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  /**
   * 空 = 制限なし（全員がプルダウンに表示）
   * 1件以上 = ここに含まれる ID のみプルダウンに表示
   */
  pinnedVisibleUserIds: string[];
  togglePinnedVisible: (id: string, allDirectoryUserIds: readonly string[]) => void;
  clearPinnedVisible: () => void;
};

function normalizeWhenFull(
  pinned: string[],
  allIdslen: number
): string[] {
  if (pinned.length === 0 || allIdslen === 0) return pinned;
  if (pinned.length >= allIdslen) return [];
  return pinned;
}

export const useDirectoryVisibilityStore = create<State>()(
  persist(
    (set, get) => ({
      pinnedVisibleUserIds: [],
      togglePinnedVisible: (id, allDirectoryUserIds) => {
        const allIds = [...new Set(allDirectoryUserIds)];
        const pinned = get().pinnedVisibleUserIds;

        if (pinned.length === 0) {
          const next = allIds.filter((x) => x !== id);
          set({
            pinnedVisibleUserIds: next.length === 0 ? [] : next,
          });
          return;
        }

        if (pinned.includes(id)) {
          const next = pinned.filter((x) => x !== id);
          set({
            pinnedVisibleUserIds: next.length === 0 ? [] : next,
          });
          return;
        }

        const next = normalizeWhenFull([...pinned, id], allIds.length);
        set({ pinnedVisibleUserIds: next });
      },
      clearPinnedVisible: () => set({ pinnedVisibleUserIds: [] }),
    }),
    { name: "brm-directory-pinned-visible" }
  )
);
