import type { ReactNode } from "react";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const textareaClass =
  "mt-1.5 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const selectClass =
  "mt-1.5 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

/** 1行入力と同じ見た目の 1px 枠。textarea は UA の立体枠・影で太く見えないよう抑える */
export const fieldInputMultilineClass = `${inputClass} min-h-[4.5rem] resize-y appearance-none shadow-none focus:shadow-none [box-shadow:none] [-webkit-appearance:none]`;

export function FormShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto max-w-3xl space-y-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  required,
  className = "",
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-slate-700 ${className}`}
    >
      {children}
      {required ? (
        <span className="ml-1 text-red-500" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-red-600" role="alert">
      {message}
    </p>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
      {children}
    </div>
  );
}

export const fieldInputClass = inputClass;
export const fieldTextareaClass = textareaClass;
export const fieldSelectClass = selectClass;

export function PrimaryButton({
  children,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="inline-flex min-h-[42px] min-w-[120px] items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
