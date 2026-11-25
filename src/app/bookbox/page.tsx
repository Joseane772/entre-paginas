import type { Metadata } from "next";

export const metadata: Metadata = { title: "BookBox" };

const PLANS = [
  { name: "BookBox Independente", blurb: "Para experimentar, sem subscrição.", items: ["Uma caixa temática com livro e brindes", "Compra pontual"] },
  { name: "BookBox Plano Mensal", blurb: "O plano principal.", items: ["Uma box nova todos os meses", "Escolhida a partir do teu perfil de leitura", "Podes recusar um livro que já leste"], featured: true },
  { name: "BookBox Presente", blurb: "Para oferecer a outra pessoa.", items: ["Uma caixa temática com livro e brindes", "Pensada para presentear"] },
];

export default function BookBoxPage() {
  return (
    <>
      <h1 className="section-title" style={{ marginTop: 0 }}>
        BookBox
      </h1>
      <div className="notice">
        <p>
          A BookBox ainda está em preparação. Vai usar o teu perfil de leitura (géneros, língua, sagas ou
          livros únicos) e o que já leste para escolher o livro de cada mês.
        </p>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {PLANS.map((p) => (
          <section key={p.name} className="panel" style={p.featured ? { borderColor: "var(--acc)" } : undefined}>
            {p.featured && <span className="pill pill-solid">Mais popular</span>}
            <h2 style={{ marginTop: 8 }}>{p.name}</h2>
            <p className="sub">{p.blurb}</p>
            <ul>
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p className="muted">Preço a definir</p>
          </section>
        ))}
      </div>
    </>
  );
}
