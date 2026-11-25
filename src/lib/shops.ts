/**
 * Where to buy or borrow. These are search links (no affiliate deals yet);
 * an ISBN from a Portuguese edition gives the most precise result.
 */
export type Shop = { name: string; what: string; action: string; url: (q: string) => string };

const enc = encodeURIComponent;

export const SHOPS: Shop[] = [
  { name: "Wook", what: "Livro e e-book", action: "Procurar", url: (q) => `https://www.wook.pt/pesquisa?keyword=${enc(q)}` },
  { name: "Bertrand", what: "Livro, com levantamento em livraria", action: "Procurar", url: (q) => `https://www.bertrand.pt/pesquisa/${enc(q)}` },
  { name: "Fnac", what: "Livro e e-book", action: "Procurar", url: (q) => `https://www.fnac.pt/SearchResult/ResultList.aspx?Search=${enc(q)}` },
  { name: "Almedina", what: "Livro", action: "Procurar", url: (q) => `https://www.almedina.net/catalogsearch/result/?q=${enc(q)}` },
  { name: "Kobo", what: "E-book", action: "Procurar", url: (q) => `https://www.kobo.com/pt/pt/search?query=${enc(q)}` },
  { name: "Storytel", what: "Audiolivro", action: "Ouvir", url: (q) => `https://www.storytel.com/pt/search?query=${enc(q)}` },
];

export const LIBRARY = {
  name: "PORBASE",
  what: "Catálogo coletivo das bibliotecas portuguesas",
  url: "https://porbase.bnportugal.gov.pt/",
};
