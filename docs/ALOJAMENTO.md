# Alojar o Entre Páginas no teu computador ou servidor

Podes pôr a tua própria cópia do site a funcionar em Windows, macOS ou Linux. O Docker trata de
tudo: o site e a base de dados Postgres. Não precisas de instalar Node.js nem Postgres.

*English version: [SELF-HOSTING.md](SELF-HOSTING.md).*

- [1. Instalar o Docker](#1-instalar-o-docker)
- [2. Obter o código](#2-obter-o-código)
- [3. Arrancar](#3-arrancar)
- [4. Criar a conta de administrador](#4-criar-a-conta-de-administrador)
- [Definições](#definições)
- [Usar a partir de outros dispositivos na rede](#usar-a-partir-de-outros-dispositivos-na-rede)
- [Pôr na internet (domínio próprio, HTTPS)](#pôr-na-internet-domínio-próprio-https)
- [Emails (recuperar a palavra-passe)](#emails-recuperar-a-palavra-passe)
- [Entrar com Google](#entrar-com-google)
- [No dia a dia](#no-dia-a-dia): registos, parar/arrancar, atualizações, cópias de segurança
- [Resolução de problemas](#resolução-de-problemas)

## O que é preciso

- Um computador ou servidor de 64 bits (x86 ou ARM, incluindo Apple Silicon e Raspberry Pi 4/5).
- Cerca de **2 GB de RAM livres** enquanto a imagem é construída (4 GB é confortável) e **3 GB de
  disco**. Depois de construído, o site usa cerca de 300 MB de RAM.
- Ligação à internet: os livros são importados do Open Library, da Wikidata e da Wikipédia.

## 1. Instalar o Docker

| Sistema | O que instalar |
| --- | --- |
| Windows 10/11 | [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/). Mantém a opção "Use WSL 2", que vem ligada. |
| macOS | [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/). Escolhe Apple silicon ou Intel, conforme o teu Mac. |
| Linux | [Docker Engine](https://docs.docker.com/engine/install/) e o plugin Compose (`docker compose version` deve mostrar 2.24 ou mais recente). |

No Windows e no macOS, **abre o Docker Desktop** e espera que diga que está a correr antes de
continuar.

## 2. Obter o código

Com git:

```bash
git clone https://github.com/Joseane772/entre-paginas.git
cd entre-paginas
```

Sem git: na página do GitHub, carrega em **Code → Download ZIP**, descompacta o ficheiro e abre um
terminal nessa pasta:
- **Windows:** no Explorador de Ficheiros, clica com o botão direito dentro da pasta e escolhe
  *Abrir no Terminal*.
- **macOS:** clica com o botão direito na pasta e escolhe *Novo Terminal na Pasta*.

## 3. Arrancar

```bash
docker compose up -d
```

Da primeira vez demora 3 a 10 minutos, porque a imagem é construída no teu computador. O comando
termina quando tudo estiver a funcionar. A partir daí, arrancar demora segundos.

Abre **http://localhost:3000**.

O site já vem com um catálogo inicial: algumas dezenas de livros, com as sagas, as adaptações e as
edições portuguesas. Os dados ficam guardados em volumes do Docker, por isso mantêm-se quando
reinicias o site ou o computador. Os contentores voltam a arrancar sozinhos quando o Docker
arranca.

## 4. Criar a conta de administrador

Carrega em **Entrar → Criar conta**. **A primeira conta criada passa a ser a de administrador.**
Fica com a ligação **Admin**, onde podes corrigir dados dos livros e gerir utilizadores.

Para escolher os administradores pelo email, define `ADMIN_EMAILS` antes de alguém se registar
(ver Definições, abaixo). Também podes:
- adicionar leitores em **Admin → Utilizadores → Adicionar leitor** (nome, email, palavra-passe
  inicial e papel);
- tornar administradora uma conta que já existe, na mesma página, ou com:

```bash
docker compose exec db psql -U entrepaginas -c "update \"user\" set role = 'admin' where email = 'alguem@example.com';"
```

## Definições

As definições ficam num ficheiro chamado `.env`, na mesma pasta que o `docker-compose.yml`, uma por
linha no formato `NOME=valor`. Todas são opcionais. Depois de mudares alguma, aplica-a com
`docker compose up -d`.

Exemplo de `.env`:

```ini
PORT=8080
ADMIN_EMAILS=eu@example.com
DATA_USER_AGENT=EntrePaginas/0.1 (+https://livros.example.pt)
```

| Definição | Por omissão | Para que serve |
| --- | --- | --- |
| `PORT` | `3000` | Porta onde o site responde. |
| `PUBLIC_URL` | `http://localhost:PORT` | O endereço que as pessoas escrevem para chegar ao site. Usado nas ligações dos emails de recuperação de palavra-passe. |
| `TRUSTED_ORIGINS` | nenhum | Outros endereços pelos quais o site é aberto, separados por vírgulas (ex.: `http://livros.casa:3000`). Os IPs da rede local funcionam sem isto. |
| `ADMIN_EMAILS` | nenhum | Emails, separados por vírgulas, que ficam administradores ao registar-se. Se estiver vazio, a primeira conta criada fica administradora. |
| `BETTER_AUTH_SECRET` | gerado | Assina as sessões. Por omissão é criado no primeiro arranque e guardado no volume `appdata`. Define o teu (`openssl rand -base64 32`) se pensas mudar o site para outra máquina. |
| `IMPORTS_PER_HOUR` | `10` | Quantos livros cada leitor pode importar por hora. Os administradores não têm limite. |
| `DATA_USER_AGENT` | `EntrePaginas/0.1 (self-hosted)` | Como o site se identifica ao Open Library e à Wikidata. Pedem um endereço ou email de contacto; junta o teu se importares muitos livros. |
| `TMDB_READ_TOKEN` | nenhum | "API Read Access Token" do [TMDB](https://www.themoviedb.org/settings/api). Junta cartazes e sinopses em pt-PT às adaptações para cinema e televisão. |
| `GOOGLE_BOOKS_API_KEY` | nenhum | Chave do Google Books. Encontra edições portuguesas que o Open Library não tem. |
| `SMTP_URL`, `MAIL_FROM` | nenhum | Email para recuperar a palavra-passe. Ver [Emails](#emails-recuperar-a-palavra-passe). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | nenhum | Junta o botão "Continuar com Google". Ver [Entrar com Google](#entrar-com-google). |
| `DB_PORT` | `5433` | Porta que expõe a base de dados só a este computador (para ferramentas de desenvolvimento). Muda-a se a 5433 já estiver ocupada. |
| `DOMAIN` | nenhum | O teu domínio, usado apenas na configuração HTTPS abaixo. |

O [`.env.example`](../.env.example) descreve as mesmas definições (em inglês), e mais algumas que só
interessam para desenvolvimento.

## Usar a partir de outros dispositivos na rede

Qualquer pessoa na tua rede de casa pode abrir o site e criar a sua própria conta, sem configurar
nada:

1. Descobre o IP local do teu computador:
   - **Windows:** corre `ipconfig` e procura "Endereço IPv4".
   - **macOS:** Definições do Sistema → Wi-Fi → Detalhes.
   - **Linux:** corre `ip -4 addr` (ou `hostname -I` na maioria das distribuições).

   Costuma ser algo como `192.168.1.20`.
2. No outro dispositivo, abre `http://192.168.1.20:3000` (com o teu IP) e depois **Entrar → Criar
   conta**.

Entrar e criar conta são aceites a partir do endereço pelo qual o site foi aberto, quando esse
endereço é um IP da rede local (`192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`), `localhost` ou um nome
`.local`. Pedidos vindos de outros sites continuam a ser recusados. Para qualquer outro nome (um
nome dado pelo router, um endereço de VPN), junta-o a `TRUSTED_ORIGINS` (ex.:
`TRUSTED_ORIGINS=http://livros.casa:3000`).

As ligações dos emails de recuperação usam o `PUBLIC_URL`. Se toda a gente vai usar o IP, define
`PUBLIC_URL=http://192.168.1.20:3000` para essas ligações funcionarem noutros dispositivos.

Se não abrir, a firewall pode estar a bloquear a porta 3000. No Windows, permite o "Docker Desktop
Backend" quando aparecer o aviso, ou cria uma regra de entrada para a porta TCP 3000.

## Pôr na internet (domínio próprio, HTTPS)

Usa um servidor sempre ligado: um pequeno servidor na nuvem (VPS) ou um servidor em casa com as
portas 80 e 443 encaminhadas. O `docker-compose.https.yml` põe o [Caddy](https://caddyserver.com) à
frente do site; o Caddy obtém um certificado HTTPS gratuito da Let's Encrypt e renova-o sozinho.

1. Compra ou usa um domínio e cria um **registo A** no DNS (e **AAAA** para IPv6) a apontar esse
   domínio, ou um subdomínio como `livros.example.pt`, para o IP público do servidor.
2. Abre as portas **80** e **443** na firewall do servidor. Não é preciso abrir mais nenhuma.
3. No servidor, na pasta do projeto, cria o `.env`:

   ```ini
   DOMAIN=livros.example.pt
   ADMIN_EMAILS=tu@example.com
   DATA_USER_AGENT=EntrePaginas/0.1 (+https://livros.example.pt)
   # Recomendado antes de convidar pessoas:
   SMTP_URL=smtps://utilizador:palavra-passe@smtp.example.com:465
   MAIL_FROM="Entre Páginas <no-reply@example.pt>"
   ```

4. Arranca com os dois ficheiros:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
   ```

   Para não escreveres os dois ficheiros sempre, junta esta linha ao `.env`:
   `COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml` (no Windows usa `;` em vez de `:`).
   A partir daí, os comandos `docker compose ...` usam os dois.

5. Abre `https://livros.example.pt`. O certificado fica pronto cerca de um minuto depois de o DNS
   estar a funcionar. Com esta configuração, a porta 3000 deixa de estar exposta: tudo passa pelo
   Caddy, e `http://` redireciona para `https://`.

Se já tens um proxy (nginx, Traefik, Cloudflare Tunnel), não uses o ficheiro HTTPS:
- aponta o proxy para a porta 3000;
- define `PUBLIC_URL=https://o-teu-dominio`;
- garante que o proxy passa o cabeçalho `Host` original.

## Emails (recuperar a palavra-passe)

Sem email configurado, o site funciona na mesma. Quando alguém pede para recuperar a
palavra-passe, a ligação é escrita nos registos do servidor em vez de ser enviada. Como
administrador, podes encontrá-la com:

```bash
docker compose logs app | grep -A6 "email não enviado"
```

Para enviar emails a sério, define `SMTP_URL` com o endereço SMTP do teu fornecedor e `MAIL_FROM`
com o remetente. Qualquer fornecedor serve: Brevo, Mailgun, Amazon SES, Fastmail ou o teu próprio
servidor de correio.

```ini
SMTP_URL=smtps://UTILIZADOR:PALAVRA-PASSE@smtp.example.com:465
MAIL_FROM="Entre Páginas <no-reply@example.pt>"
```

Se o utilizador ou a palavra-passe tiverem caracteres especiais (`@`, `:`, `/`), codifica-os para
URL: por exemplo, `@` passa a `%40`. Usa a porta 465 com `smtps://`, ou a 587 com `smtp://`.

## Entrar com Google

1. Na [consola do Google Cloud](https://console.cloud.google.com/apis/credentials), cria um
   **ID de cliente OAuth** do tipo *Aplicação Web*.
2. Junta este URI de redirecionamento autorizado:
   `https://O-TEU-DOMINIO/api/auth/callback/google`, ou
   `http://localhost:3000/api/auth/callback/google` para uso local.
3. Põe o ID e o segredo no `.env` como `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` e corre
   `docker compose up -d`.

## No dia a dia

Corre estes comandos na pasta do projeto. Se usas a configuração HTTPS sem `COMPOSE_FILE` no
`.env`, junta `-f docker-compose.yml -f docker-compose.https.yml` a seguir a `docker compose`.

| Tarefa | Comando |
| --- | --- |
| Ver se está a correr | `docker compose ps` |
| Ver os registos | `docker compose logs -f app` (Ctrl+C deixa de mostrar, não para o site) |
| Parar | `docker compose stop` |
| Voltar a arrancar | `docker compose start` |
| Aplicar definições alteradas | `docker compose up -d` |

### Atualizar para uma versão nova

```bash
git pull                       # ou transfere o ZIP novo para cima da pasta antiga (guarda o .env)
docker compose up -d --build
```

As alterações à base de dados aplicam-se sozinhas quando o site arranca, e as contas, opiniões e
livros mantêm-se. O catálogo inicial só é carregado no primeiro arranque; a partir daí, os livros
que tens são os que importaste.

### Juntar livros

Pesquisa um livro no site. Se ainda não estiver no catálogo, os resultados do Open Library têm um
botão **Importar**. É preciso ter sessão iniciada.

### Capas erradas

Às vezes as fontes associam a imagem errada a uma edição (uma fotografia, um cartaz). As
importações já verificam cada capa e passam à seguinte se a imagem não tiver proporções de livro.
Para verificar todo o catálogo e corrigir o que encontrar (precisa de Node.js, ver o
[LEIA-ME](../LEIA-ME.md#para-quem-desenvolve)):

```bash
npm run check-covers -- --fix
```

### Cópias de segurança

Todos os dados (contas, estantes, opiniões, livros importados, correções) estão na base de dados.
Para criar uma cópia `entre-paginas.dump` na pasta atual:

```bash
docker compose exec db pg_dump -U entrepaginas -Fc -f /tmp/backup.dump entrepaginas
docker compose cp db:/tmp/backup.dump ./entre-paginas.dump
```

Para a repor, no mesmo ou noutro computador, depois de `docker compose up -d`:

```bash
docker compose cp ./entre-paginas.dump db:/tmp/backup.dump
docker compose exec db pg_restore -U entrepaginas -d entrepaginas --clean --if-exists /tmp/backup.dump
```

Estes comandos funcionam da mesma forma no PowerShell, no Terminal do macOS e em Linux. Repor
noutro computador mantém as contas e as palavras-passe de toda a gente, mas cada leitor tem de
voltar a entrar, a não ser que copies o mesmo `BETTER_AUTH_SECRET`.

### Começar do zero

Isto **apaga todos os dados** (contas, opiniões, livros importados) e volta ao catálogo inicial:

```bash
docker compose down -v
docker compose up -d
```

## Resolução de problemas

**"Cannot connect to the Docker daemon" / "docker: command not found".** O Docker Desktop não está
a correr, ou não está instalado. Abre-o e tenta outra vez. Em Linux, junta-te ao grupo `docker`
(e depois sai e volta a entrar na sessão) ou usa `sudo`.

**"port is already allocated" / "address already in use".** Outro programa está a usar a porta
3000 (ou a 5433). Escolhe outra no `.env`, por exemplo `PORT=8080` ou `DB_PORT=5434`, e corre
`docker compose up -d` outra vez.

**Entrar ou criar conta falha com "Este endereço do site não está autorizado".** Estás a abrir o
site por um nome que não é o `PUBLIC_URL` nem um endereço da rede local, por exemplo um nome dado
pelo router ou uma VPN. Junta esse endereço a `TRUSTED_ORIGINS`, ou define-o como `PUBLIC_URL`.
Confirma também que não trocaste `http` com `https`.

**A construção para com "killed" ou "out of memory".** O computador tem menos de cerca de 2 GB
livres. No Docker Desktop, aumenta a memória em Settings → Resources. Num servidor pequeno, junta
memória swap e corre `docker compose up -d --build` outra vez.

**"set: illegal option -" ou "exec format error" nos registos da aplicação.** Os ficheiros foram
gravados com fins de linha do Windows. Isto já é corrigido automaticamente, mas uma transferência
antiga pode não ter a correção. Transfere a versão mais recente, ou corre
`git config --global core.autocrlf input` e clona outra vez.

**Importar um livro falha.** O Open Library e a Wikidata às vezes estão lentos ou em baixo por uns
minutos. Espera um pouco e tenta de novo. `docker compose logs app` mostra o motivo.

**Esqueci-me da palavra-passe de administrador.** Usa *Esqueci-me da palavra-passe* na página de
entrada. Sem email configurado, a ligação está nos registos (ver
[Emails](#emails-recuperar-a-palavra-passe)).

**O certificado HTTPS não é emitido.** Confirma o seguinte e depois vê
`docker compose logs caddy`:
- o DNS do domínio aponta para este servidor (`nslookup o-teu-dominio`);
- as portas 80 e 443 estão abertas;
- mais nada no servidor está a usá-las.

A Let's Encrypt limita as tentativas, por isso corrige a causa antes de reiniciar muitas vezes.
