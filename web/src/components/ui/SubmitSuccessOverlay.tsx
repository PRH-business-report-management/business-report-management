"use client";

/** 数秒表示してからコールバック（遷移など） */
export function SubmitSuccessOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md rounded-xl bg-white px-8 py-10 text-center shadow-lg">
        <p className="text-lg font-medium tracking-tight text-slate-900">
          {message}
        </p>
      </div>
    </div>
  );
}
