import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecList } from "@/components/taste/RecList";
import { recommendFor } from "@/lib/data/recommend";
import { requireUserPage } from "@/lib/session";
import { answerLabel, GENRES, QUESTIONS, type TasteAnswers } from "@/lib/taste";

export const metadata: Metadata = { title: "Para ti", robots: { index: false } };

export default function RecommendationsPage() {
  return (
    <>
      <header className="page-head">
        <h1>Para ti</h1>
        <p className="sub">
          Livros escolhidos a partir dos teus gostos, do que já leste e das estrelas que deste. Quanto mais usares a
          estante, melhores ficam.
        </p>
      </header>
      <Suspense fallback={<div className="panel skeleton" style={{ height: 320 }} />}>
        <Recommendations />
      </Suspense>
    </>
  );
}

async function Recommendations() {
  const { user } = await requireUserPage("/recomendacoes");
  const { hasSignals, profile, items } = await recommendFor(user.id);

  if (!hasSignals)
    return (
      <div className="empty">
        <p>Ainda não sabemos o que gostas de ler.</p>
        <p>
          <Link className="btn btn-solid" href="/questionario">
            Responder ao questionário
          </Link>
        </p>
        <p>Ou marca alguns livros como lidos e dá-lhes estrelas.</p>
      </div>
    );

  return (
    <>
      {profile ? (
        <ProfileSummary profile={profile} />
      ) : (
        <div className="notice">
          <p>Responde ao questionário de gostos para recomendações mais certeiras.</p>
          <Link className="btn" href="/questionario">
            Responder
          </Link>
        </div>
      )}
      {items.length ? (
        <RecList items={items} />
      ) : (
        <p className="empty">
          Por agora não temos mais nada parecido com o que gostas. Pesquisa e importa outros livros, ou muda as tuas
          respostas.
        </p>
      )}
    </>
  );
}

function ProfileSummary({ profile }: { profile: TasteAnswers }) {
  const rows: [string, string][] = [];
  for (const q of QUESTIONS) {
    if (q.key === "box") continue; // only for the BookBox
    const v = profile[q.key];
    if (q.key === "genres") {
      if (profile.genres.length) rows.push([q.q, profile.genres.map((g) => GENRES[g]).join(", ")]);
    } else if (v) rows.push([q.q, answerLabel(q.key, v as string)]);
  }
  return (
    <details className="panel" style={{ marginBottom: 22 }}>
      <summary>
        <b>As tuas respostas</b> <span className="muted">
          ({profile.lovedWorkIds.length} {profile.lovedWorkIds.length === 1 ? "livro preferido" : "livros preferidos"})
        </span>
      </summary>
      <dl className="profile-sum" style={{ marginTop: 12 }}>
        {rows.map(([q, a]) => (
          <div key={q} style={{ display: "contents" }}>
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>
      <Link className="btn" href="/questionario">
        Mudar respostas
      </Link>
    </details>
  );
}
