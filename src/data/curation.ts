/**
 * Hand corrections to imported data, keyed by Wikidata id.
 *
 * Imports apply these on top of what the sources say, so a re-import never undoes them.
 * `npm run curate` applies them to the existing database without re-importing.
 *
 * Titles are the Portugal (PT-PT) edition titles. Wikidata's "pt" label is often the
 * Brazilian title, so check a Portuguese bookshop (Wook, Bertrand) or the publisher before
 * adding one, and note the source.
 */

export type WorkCuration = {
  title?: string;
  originalTitle?: string;
  synopsis?: string;
  /** Shown on the book page, under the synopsis. */
  note?: string;
  /** Not a book of its series (appendix, short story, translation item): drop it from reading orders. */
  hideFromSeries?: boolean;
  /** Where the correction comes from. Not shown. */
  source?: string;
};

export type SeriesCuration = { name: string; source?: string };

const SPLIT_SE = (a: string, b: string) =>
  `Em Portugal, a Saída de Emergência publicou este livro em dois volumes: ${a} e ${b}.`;

export const WORKS: Record<string, WorkCuration> = {
  // O Senhor dos Anéis (Europa-América). "A Sociedade do Anel" / "O Retorno do Rei" are the Brazilian titles.
  Q208002: { title: "A Irmandade do Anel", source: "Europa-América; pt.wikipedia" },
  Q332581: { title: "O Regresso do Rei", source: "Europa-América; pt.wikipedia" },
  Q334335: { hideFromSeries: true, source: "appendices, not a volume" },

  // Harry Potter (Editorial Presença)
  Q46887: { title: "Harry Potter e o Príncipe Misterioso", source: "Presença; wook.pt" },
  Q46758: { title: "Harry Potter e os Talismãs da Morte", source: "Presença; wook.pt" },
  Q77808986: { title: "Harry Potter e a Criança Amaldiçoada", source: "Presença; presenca.pt" },
  Q1148668: { hideFromSeries: true, source: "800-word prequel short story (2008)" },

  // Os Jogos da Fome (Editorial Presença)
  Q11678: { title: "Os Jogos da Fome", source: "Presença; wook.pt" },
  Q40354: { title: "A Revolta", source: "Presença; wook.pt" },
  Q81925268: { title: "A Balada dos Pássaros e das Serpentes", source: "Presença; presenca.pt" },
  Q126390804: { title: "Amanhecer na Ceifa", source: "Presença; presenca.pt" },

  // As Crónicas de Gelo e Fogo (Saída de Emergência splits each book in two)
  Q1751870: {
    title: "A Guerra dos Tronos",
    note: SPLIT_SE("A Guerra dos Tronos", "A Muralha de Gelo"),
    source: "Saída de Emergência; pt.wikipedia",
  },
  Q300370: {
    title: "A Fúria dos Reis",
    note: SPLIT_SE("A Fúria dos Reis", "O Despertar da Magia"),
    source: "Saída de Emergência; pt.wikipedia",
  },
  Q431927: {
    title: "A Tormenta de Espadas",
    note: SPLIT_SE("A Tormenta de Espadas", "A Glória dos Traidores"),
    source: "Saída de Emergência; pt.wikipedia",
  },
  Q1764445: {
    title: "O Festim dos Corvos",
    note: SPLIT_SE("O Festim dos Corvos", "O Mar de Ferro"),
    source: "Saída de Emergência; pt.wikipedia",
  },
  Q28306: {
    title: "A Dança dos Dragões",
    note: SPLIT_SE("A Dança dos Dragões", "Os Reinos do Caos"),
    source: "Saída de Emergência; pt.wikipedia",
  },
  Q2712708: { note: "Ainda não publicado.", source: "unreleased" },
  Q10371726: { note: "Ainda não publicado.", source: "unreleased" },
  Q55611675: { title: "Sangue e Fogo", source: "Saída de Emergência; wook.pt" },
  Q113458956: { hideFromSeries: true, source: "Norwegian translation item, not a book of the series" },

  // The Witcher (Saída de Emergência)
  Q2045474: { title: "O Tempo do Desprezo", source: "Saída de Emergência; wook.pt" },
  Q15260619: { title: "Tempos de Tempestade", source: "Saída de Emergência; wook.pt" },

  // Duna (Saída de Emergência / Relógio D'Água). "Os Filhos de Duna" etc. are the Brazilian titles.
  Q437365: { title: "Filhos de Duna", source: "Relógio D'Água; pt.wikipedia" },
  Q401619: { title: "O Imperador Deus de Duna", source: "Relógio D'Água; pt.wikipedia" },

  // Wikidata's P1476 for this one is misspelt Spanish-ish ("Ensayo sobre a ceguera").
  Q826428: { originalTitle: "Ensaio sobre a Cegueira", source: "Caminho" },
};

export const SERIES: Record<string, SeriesCuration> = {
  Q45875: { name: "As Crónicas de Gelo e Fogo", source: "Brazilian spelling on Wikidata (Crônicas)" },
  Q11835640: { name: "The Witcher", source: "Saída de Emergência collection name" },
  Q11679: { name: "Os Jogos da Fome", source: "Presença" },
  Q8337: { name: "Harry Potter", source: "label only in 'mul' on Wikidata" },
};

export const curatedWork = (qid?: string | null): WorkCuration => (qid && WORKS[qid]) || {};
export const curatedSeriesName = (qid: string, fallback: string) => SERIES[qid]?.name ?? fallback;
