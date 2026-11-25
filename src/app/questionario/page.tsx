import type { Metadata } from "next";
import { Suspense } from "react";
import { TasteQuiz } from "@/components/taste/TasteQuiz";
import { getPickableBooks, getTasteProfile } from "@/lib/data/recommend";
import { requireUserPage } from "@/lib/session";
import { EMPTY_ANSWERS } from "@/lib/taste";

export const metadata: Metadata = { title: "Os teus gostos de leitura", robots: { index: false } };

export default function QuestionnairePage() {
  return (
    <>
      <header className="page-head">
        <h1>Os teus gostos de leitura</h1>
        <p className="sub">
          Sete perguntas rápidas. Usamos as respostas para te recomendar livros e, em breve, para escolher a tua BookBox.
          Podes mudá-las quando quiseres.
        </p>
      </header>
      <Suspense fallback={<div className="panel skeleton qz" style={{ height: 320 }} />}>
        <Quiz />
      </Suspense>
    </>
  );
}

async function Quiz() {
  const { user } = await requireUserPage("/questionario");
  const [profile, books] = await Promise.all([getTasteProfile(user.id), getPickableBooks()]);
  return <TasteQuiz initial={profile ?? EMPTY_ANSWERS} books={books} />;
}
