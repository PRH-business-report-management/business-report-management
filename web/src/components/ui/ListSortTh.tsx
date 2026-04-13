"use client";

export type ListSortDir = "asc" | "desc";

type ListSortThProps = {
  label: string;
  active: boolean;
  dir: ListSortDir;
  onClick: () => void;
  /** 既定は一覧ページ用。ダッシュボードは `px-4 py-3` など */
  className?: string;
};

export function ListSortTh({
  label,
  active,
  dir,
  onClick,
  className = "px-3 py-2",
}: ListSortThProps) {
  return (
    <th className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-0.5 font-medium text-zinc-600 hover:text-zinc-900"
        onClick={onClick}
      >
        {label}
        <span className="tabular-nums text-zinc-400">
          {active ? (dir === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}
