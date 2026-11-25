import Link from "next/link";
import { getSession } from "@/lib/session";
import { ImportButton } from "./ImportButton";

/** Imports call several external APIs, so they're for signed-in readers only. Render inside <Suspense>. */
export async function ImportGate(props: React.ComponentProps<typeof ImportButton> & { returnTo: string }) {
  const { returnTo, ...button } = props;
  if (!(await getSession()))
    return (
      <Link className="btn" href={`/entrar?voltar=${encodeURIComponent(returnTo)}`}>
        Entrar para importar
      </Link>
    );
  return <ImportButton {...button} />;
}
