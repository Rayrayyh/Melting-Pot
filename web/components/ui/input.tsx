import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const controlBase =
  "w-full bg-surface border border-edge-strong rounded-(--radius-control) text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus-visible:outline-none transition-colors";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-10 px-3.5 text-sm", className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "p-3.5 text-sm leading-relaxed resize-none", className)}
      {...rest}
    />
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-ink"
      >
        {label}
      </label>
      {children({
        id,
        ...(error ? { "aria-invalid": true } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
