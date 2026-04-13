"use client";

/** ◀ ▶ でページ切り替え（1ページあたり pageSize 件） */
export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;
  const btn =
    "inline-flex min-w-[2.5rem] items-center justify-center rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-2">
      <button
        type="button"
        className={btn}
        disabled={!canPrev}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="前のページ"
      >
        ◀
      </button>
      <span className="tabular-nums text-sm text-zinc-600">
        {safePage} / {totalPages}（全 {total} 件）
      </span>
      <button
        type="button"
        className={btn}
        disabled={!canNext}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="次のページ"
      >
        ▶
      </button>
    </div>
  );
}
