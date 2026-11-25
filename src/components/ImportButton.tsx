"use client";

import { useActionState } from "react";
import { importBook, type ImportState } from "@/app/actions";

/** Posts to the import action; imports take 5–30 s, so show progress and errors inline. */
export function ImportButton({
  ol,
  qid,
  label = "Importar",
  pendingLabel = "A importar…",
}: {
  ol?: string;
  qid?: string;
  label?: string;
  pendingLabel?: string;
}) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importBook, {});
  return (
    <form action={action} className="import-form">
      {ol && <input type="hidden" name="ol" value={ol} />}
      {qid && <input type="hidden" name="qid" value={qid} />}
      <button className="btn" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? pendingLabel : label}
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
