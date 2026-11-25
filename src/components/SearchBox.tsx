import Form from "next/form";

/** Plain GET form to /pesquisa: works without JavaScript, and next/form makes it a client navigation. */
export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <Form action="/pesquisa" className="search" role="search">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Pesquisa um livro, autor ou saga"
        aria-label="Pesquisar livro, autor ou saga"
        autoComplete="off"
        autoFocus={autoFocus}
        required
      />
      <button className="btn btn-solid" type="submit">
        Pesquisar
      </button>
    </Form>
  );
}
