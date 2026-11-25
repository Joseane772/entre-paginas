"use client";

import { useActionState } from "react";
import type { AdminResult } from "@/app/admin/actions";

/** A form bound to an admin server action, with inline result/error. */
export function ActionForm({
  action,
  children,
  submit,
  className = "form",
  danger,
}: {
  action: (prev: AdminResult, f: FormData) => Promise<AdminResult>;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className={className}>
      {children}
      <div>
        <button className={`btn ${danger ? "btn-danger" : "btn-solid"}`} type="submit" disabled={pending}>
          {pending ? "Um momento…" : submit}
        </button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.ok && !pending && <p className="form-ok">{state.ok}</p>}
    </form>
  );
}
