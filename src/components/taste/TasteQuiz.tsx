"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveTasteProfile } from "@/app/taste-actions";
import { Cover } from "@/components/Cover";
import { MAX_LOVED, QUESTIONS, type TasteAnswers } from "@/lib/taste";

type Book = { id: number; title: string; authors: string; coverUrl: string | null };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** One question per screen, then an optional "books you loved" step, then save. */
export function TasteQuiz({ initial, books }: { initial: TasteAnswers; books: Book[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<TasteAnswers>(initial);
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const total = QUESTIONS.length + 1;
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const shown = useMemo(() => {
    const q = fold(filter.trim());
    return q ? books.filter((b) => fold(`${b.title} ${b.authors}`).includes(q)) : books;
  }, [books, filter]);

  const save = () =>
    start(async () => {
      const r = await saveTasteProfile(answers);
      if (r.error) setError(r.error);
      else router.push("/recomendacoes");
    });

  const head = (
    <div className="qz-top">
      <span>
        Passo {step + 1} de {total}
      </span>
      <div className="qz-bar" aria-hidden>
        <i style={{ width: `${Math.round((step / (total - 1)) * 100)}%` }} />
      </div>
    </div>
  );

  if (step < QUESTIONS.length) {
    const q = QUESTIONS[step];
    const multi = "multi" in q && q.multi;
    const value = answers[q.key];
    const isOn = (k: string) => (Array.isArray(value) ? (value as string[]).includes(k) : value === k);
    const pick = (k: string) => {
      if (q.key === "genres") {
        const g = answers.genres as string[];
        setAnswers({ ...answers, genres: (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]) as TasteAnswers["genres"] });
      } else {
        setAnswers({ ...answers, [q.key]: value === k ? null : k });
        if (value !== k) next();
      }
    };
    return (
      <section className="panel qz" aria-labelledby="qz-q">
        {head}
        <h2 id="qz-q">{q.q}</h2>
        {multi && <p className="sub">Podes escolher mais do que um.</p>}
        <div className="qz-opts" role="group" aria-labelledby="qz-q">
          {Object.entries(q.options).map(([k, label]) => (
            <button key={k} type="button" className="qz-opt" aria-pressed={isOn(k)} onClick={() => pick(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="qz-nav">
          {step > 0 ? (
            <button type="button" className="btn" onClick={back}>
              Anterior
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={multi ? "btn btn-solid" : "lnk"} onClick={next}>
            {multi || value ? "Seguinte" : "Saltar pergunta"}
          </button>
        </div>
      </section>
    );
  }

  const loved = answers.lovedWorkIds;
  const toggle = (id: number) =>
    setAnswers({
      ...answers,
      lovedWorkIds: loved.includes(id) ? loved.filter((x) => x !== id) : loved.length < MAX_LOVED ? [...loved, id] : loved,
    });

  return (
    <section className="panel qz" aria-labelledby="qz-q">
      {head}
      <h2 id="qz-q">Há livros de que gostaste muito?</h2>
      <p className="sub">
        Opcional. Escolhe até {MAX_LOVED}: são o ponto de partida para os livros parecidos que te vamos sugerir.
        {loved.length > 0 && ` ${loved.length} escolhido${loved.length > 1 ? "s" : ""}.`}
      </p>
      <input
        className="input"
        type="search"
        placeholder="Filtrar por título ou autor"
        aria-label="Filtrar livros"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="qz-books">
        {shown.map((b) => (
          <li key={b.id}>
            <button type="button" aria-pressed={loved.includes(b.id)} onClick={() => toggle(b.id)} title={b.authors}>
              <Cover title={b.title} author={b.authors} url={b.coverUrl} size="sm" />
              <span>{b.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="qz-nav">
        <button type="button" className="btn" onClick={back}>
          Anterior
        </button>
        <button type="button" className="btn btn-solid" onClick={save} disabled={pending}>
          {pending ? "A guardar…" : "Guardar e ver recomendações"}
        </button>
      </div>
    </section>
  );
}
