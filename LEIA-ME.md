# Entre Páginas

Um site de livros em português de Portugal onde cada livro liga tudo o que o rodeia: a ordem de
leitura da saga, as adaptações para cinema, televisão e jogos, as edições que existem em Portugal e
no Brasil, e onde o comprar ou requisitar. A BookBox (um livro surpresa por mês, escolhido a partir
do perfil de leitura) está planeada como funcionalidade central.

*English: [README.md](README.md).* A ideia original está em [docs/idea.txt](docs/idea.txt), o
protótipo em [docs/prototype/](docs/prototype/) e o que vem a seguir em
[docs/ROADMAP.md](docs/ROADMAP.md).

## Pôr a funcionar no teu computador (qualquer sistema)

Instala o [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS) ou o
Docker Engine (Linux) e corre:

```bash
git clone https://github.com/Joseane772/entre-paginas.git
cd entre-paginas
docker compose up -d
```

Abre **http://localhost:3000**. O primeiro arranque constrói a imagem (alguns minutos) e carrega um
catálogo inicial, por isso há livros logo à partida. **A primeira conta criada fica
administradora.**

Outras pessoas na mesma rede podem abrir o site pelo IP do teu computador (por exemplo
`http://192.168.1.20:3000`) e criar a sua conta, sem configurar nada.

**O guia completo está em [docs/ALOJAMENTO.md](docs/ALOJAMENTO.md):** definições, acesso a partir
de outros dispositivos, domínio próprio com HTTPS automático, email, entrar com Google,
atualizações, cópias de segurança e resolução de problemas.

## O que o site faz

- **Página de cada livro:** sinopse, ordem de leitura da saga, adaptações, onde comprar ou
  requisitar, línguas e edições portuguesas, livros parecidos.
- **Pesquisa** sem acentos (escrever "camoes" encontra "Camões"). Se um livro não estiver no
  catálogo, os resultados do Open Library têm um botão **Importar**.
- **Géneros** (`/genero/fantasia`, ...) e **todos os livros** (`/livros`).
- **Contas:** email e palavra-passe (e Google, se configurado), recuperar a palavra-passe,
  limites de tentativas.
- **A minha estante:** *Quero ler*, *A ler* e *Li*, com datas; estrelas de 1 a 5 e opinião, com
  opção de esconder spoilers.
- **A minha conta:** mudar nome e palavra-passe, transferir os dados em JSON, apagar a conta.
- **Questionário de gostos** (`/questionario`) e **Para ti** (`/recomendacoes`), explicados abaixo.
- **Administração** (`/admin`): resumo, utilizadores (adicionar leitores, tornar administrador,
  suspender) e correções por livro (título, título original, sinopse, nota, "não faz parte desta
  saga") com botão para voltar a importar.

## Questionário e recomendações

Quem tem conta responde a sete perguntas (géneros, formato, ritmo, sagas ou livros únicos,
adaptações, língua, BookBox) e pode escolher até 10 livros de que gostou. A página **Para ti**
mostra livros com o motivo de cada escolha.

As recomendações usam uma **semelhança ponderada entre livros**
([src/lib/similarity.ts](src/lib/similarity.ts)). Cada sinal vale de 0 a 1 e é multiplicado pelo
seu peso:

| Sinal | Peso |
| --- | --- |
| Votos dos leitores ("este livro é parecido com...") | 6 |
| Géneros em comum | 3 |
| Temas em comum (assuntos do Open Library) | 3 |
| Mesmo autor | 2,5 |
| Quem gostou de um também gostou do outro | 2 |
| Mesma saga | 1,5 |
| Publicados em datas próximas | 0,5 |

Os leitores votam na página de cada livro, em **Livros parecidos**. Os votos num par só contam a
partir de 2 leitores e atingem o peso máximo aos 6, para uma pessoa sozinha não ligar dois livros.
Para afinar o sistema, muda os pesos nesse ficheiro.

## Corrigir títulos e capas

As fontes erram muitas vezes os títulos portugueses: o rótulo "pt" da Wikidata é frequentemente o
título brasileiro ("A Sociedade do Anel" em vez de "A Irmandade do Anel"). As correções ficam em
[src/data/curation.ts](src/data/curation.ts), pela identificação da Wikidata, ou no editor de cada
livro em **Admin**. As importações aplicam-nas sempre; `npm run curate` aplica as do ficheiro sem
voltar a importar. Confirma o título numa livraria portuguesa (Wook, Bertrand) ou na editora antes
de o juntar.

As capas são verificadas ao importar: se a imagem não tiver proporções de capa (uma fotografia
deitada, um cartaz, uma imagem vazia), passa-se à seguinte. `npm run check-covers` verifica todo o
catálogo e `npm run check-covers -- --fix` corrige o que encontrar.

## Para quem desenvolve

É preciso Node.js 22 e Docker.

```bash
npm install
cp .env.example .env        # junta TMDB_READ_TOKEN / GOOGLE_BOOKS_API_KEY se os tiveres
npm run db:up               # Postgres em localhost:5433
npm run db:migrate
npm run seed                # importa ~10 livros e as sagas (demora alguns minutos)
npm run dev
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | tsc / eslint |
| `npm run db:up` | arranca o Postgres no Docker |
| `npm run db:generate` / `db:migrate` | cria / aplica migrações |
| `npm run import -- "nome do livro"` | importa um livro (também `--ol OL893414W`, `--wd Q190192`, `--series`) |
| `npm run curate` | aplica [src/data/curation.ts](src/data/curation.ts) à base de dados |
| `npm run check-covers` | verifica as capas (`-- --fix` corrige) |
| `npm run make-admin -- email` | dá o papel de administrador a uma conta |
| `npm run snapshot` | atualiza o catálogo inicial usado pelo `docker compose up` |
| `npm run db:load-snapshot` | carrega esse catálogo numa base de dados vazia |

Tecnologia: Next.js 16 (App Router, Cache Components) com TypeScript, Postgres 17 com Drizzle ORM e
Better Auth. Dados do Open Library, Wikidata, Wikipédia, TMDB (opcional) e Google Books
(opcional). Mais detalhes técnicos no [README](README.md) em inglês.

## Créditos

- Dados de livros e edições: [Open Library](https://openlibrary.org). Sagas e adaptações:
  [Wikidata](https://www.wikidata.org). Sinopses: Wikipédia (CC BY-SA) ou Open Library.
- Este produto usa a API do TMDB mas não é apoiado nem certificado pelo TMDB.
- Design inspirado em
  [Book Store Concept](https://dribbble.com/shots/19444133-Book-Store-Concept), de Toma (Dribbble).
  As cores são do Entre Páginas e as ilustrações são desenhadas em código; não é usado nenhum
  recurso dessa imagem.
