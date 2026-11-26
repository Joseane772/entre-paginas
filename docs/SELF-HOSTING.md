# Self-hosting Entre Páginas

You can run your own copy of the site on Windows, macOS or Linux. Docker runs the whole thing:
the website and its Postgres database. You don't need Node.js or Postgres installed.

*Em português: [ALOJAMENTO.md](ALOJAMENTO.md). Step-by-step guide for complete beginners, in
Portuguese: [COMO-INSTALAR.md](../COMO-INSTALAR.md).*

- [1. Install Docker](#1-install-docker)
- [2. Get the code](#2-get-the-code)
- [3. Start it](#3-start-it)
- [4. Create your admin account](#4-create-your-admin-account)
- [Settings](#settings)
- [Using it from other devices on your network](#using-it-from-other-devices-on-your-network)
- [Putting it on the internet (your own domain, HTTPS)](#putting-it-on-the-internet-your-own-domain-https)
- [Emails (password resets)](#emails-password-resets)
- [Sign in with Google](#sign-in-with-google)
- [Day-to-day](#day-to-day): logs, stop/start, updates, backups
- [Troubleshooting](#troubleshooting)

## What you need

- A 64-bit computer or server (x86 or ARM, including Apple Silicon and Raspberry Pi 4/5).
- About **2 GB of free RAM** while the image builds (4 GB is comfortable) and **3 GB of disk**.
  Once it's built, the site uses about 300 MB of RAM.
- An internet connection. Books are imported from Open Library, Wikidata and Wikipédia.

## 1. Install Docker

| System | What to install |
| --- | --- |
| Windows 10/11 | [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/). Keep the default "Use WSL 2" option. |
| macOS | [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/). Choose Apple silicon or Intel to match your Mac. |
| Linux | [Docker Engine](https://docs.docker.com/engine/install/) and the Compose plugin (`docker compose version` should print 2.24 or newer). |

On Windows and macOS, **start Docker Desktop** and wait until it says it's running before you
continue.

## 2. Get the code

With git:

```bash
git clone https://github.com/Joseane772/entre-paginas.git
cd entre-paginas
```

Without git: on the GitHub page, click **Code → Download ZIP**, unzip it, and open a terminal in
that folder:
- **Windows:** in File Explorer, right-click inside the folder and choose *Open in Terminal*.
- **macOS:** right-click the folder and choose *New Terminal at Folder*.

## 3. Start it

```bash
docker compose up -d --build
```

(Or double-click **Iniciar-Windows.bat**, **Iniciar-Mac.command** or **iniciar-linux.sh**: they do
the same, check Docker is running, wait for the site and open it in the browser.)

The first time takes 3–10 minutes, because the image builds on your machine. The command
returns once everything has started. After that, starting again takes a few seconds.

Open **http://localhost:3000**.

The site starts with a snapshot of the catalogue already loaded: a few dozen books with their series,
adaptations and Portuguese editions. Your data stays in Docker volumes, so you keep it across
restarts and reboots. The containers start again on their own when Docker starts.

## 4. Create your admin account

Click **Entrar → Criar conta**. **The first account you create becomes the administrator.** It
gets the **Admin** link, from which you can correct book data and manage users.

To pick admins by email instead, set `ADMIN_EMAILS` before anyone signs up (see Settings below).
To make an existing account admin:

```bash
docker compose exec db psql -U entrepaginas -c "update \"user\" set role = 'admin' where email = 'someone@example.com';"
```

From the Admin pages you can also promote other users.

## Settings

Settings go in a file called `.env` in the same folder as `docker-compose.yml`, one `NAME=value`
per line. Every setting is optional. After you change one, apply it with `docker compose up -d`.

Example `.env`:

```ini
PORT=8080
ADMIN_EMAILS=me@example.com
DATA_USER_AGENT=EntrePaginas/0.1 (+https://livros.example.pt)
```

| Setting | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port the site listens on. |
| `PUBLIC_URL` | `http://localhost:PORT` | The address people type to reach the site. It must match exactly, or sign-in is refused. |
| `TRUSTED_ORIGINS` | none | Other addresses the site is also reached at, comma-separated (e.g. `http://livros.casa:3000`). Local-network IPs work without it. |
| `ADMIN_EMAILS` | none | Comma-separated emails that become admin when they sign up. When it's empty, the first account becomes admin. |
| `BETTER_AUTH_SECRET` | generated | Signs sign-in sessions. By default one is created on first start and kept in the `appdata` volume. Set your own (`openssl rand -base64 32`) if you plan to move the site to another machine. |
| `IMPORTS_PER_HOUR` | `10` | How many books each reader can import per hour. Admins have no limit. |
| `DATA_USER_AGENT` | `EntrePaginas/0.1 (self-hosted)` | How the site identifies itself to Open Library and Wikidata. They ask for a contact URL or email, so add yours if you import a lot. |
| `TMDB_READ_TOKEN` | none | [TMDB](https://www.themoviedb.org/settings/api) "API Read Access Token". Adds posters and pt-PT synopses to film and TV adaptations. |
| `GOOGLE_BOOKS_API_KEY` | none | Google Books key. Finds Portuguese editions that Open Library doesn't have. |
| `SMTP_URL`, `MAIL_FROM` | none | Email for password resets. See [Emails](#emails-password-resets). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | none | Adds "Continuar com Google". See [Sign in with Google](#sign-in-with-google). |
| `DB_PORT` | `5433` | Port that exposes the database to this computer only (for development tools). Change it if 5433 is already taken. |
| `DOMAIN` | none | Your domain name, used only with the HTTPS setup below. |

[`.env.example`](../.env.example) describes the same settings. It also has some that only matter
for development.

## Using it from other devices on your network

Anyone on your home network can open the site and create their own account. Nothing needs
setting up:

1. Find your computer's local IP address:
   - **Windows:** run `ipconfig` and look for "IPv4 Address".
   - **macOS:** System Settings → Wi-Fi → Details.
   - **Linux:** run `ip -4 addr` (or `hostname -I` on most distributions).

   It usually looks like `192.168.1.20`.
2. On the other device, open `http://192.168.1.20:3000` (with your IP), then **Entrar → Criar
   conta**.

Sign-in and sign-up are accepted from the address the site was opened at when that address is
a local-network IP (`192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`), `localhost` or a `.local` name.
Requests from other websites are still refused. For any other name, such as a hostname on your
router or a VPN address, add it to `TRUSTED_ORIGINS` (e.g.
`TRUSTED_ORIGINS=http://livros.casa:3000`).

Password-reset links use `PUBLIC_URL`. If everyone will use the IP address, set
`PUBLIC_URL=http://192.168.1.20:3000` so those links work on other devices too.

If it doesn't load, your firewall may be blocking port 3000. On Windows, allow "Docker Desktop
Backend" when it asks, or add an inbound rule for TCP port 3000.

## Putting it on the internet (your own domain, HTTPS)

Use a server that stays on, such as a small cloud server (VPS) or a home server with ports 80
and 443 forwarded. `docker-compose.https.yml` adds [Caddy](https://caddyserver.com) in front of
the site. Caddy gets a free HTTPS certificate from Let's Encrypt and renews it on its own.

1. Buy or use a domain, and create a DNS **A record** (and **AAAA** for IPv6) pointing it, or a
   subdomain like `livros.example.pt`, at your server's public IP.
2. Open ports **80** and **443** in the server's firewall. Nothing else needs to be open.
3. On the server, in the project folder, create `.env`:

   ```ini
   DOMAIN=livros.example.pt
   ADMIN_EMAILS=you@example.com
   DATA_USER_AGENT=EntrePaginas/0.1 (+https://livros.example.pt)
   # Recommended before inviting people:
   SMTP_URL=smtps://user:password@smtp.example.com:465
   MAIL_FROM="Entre Páginas <no-reply@example.pt>"
   ```

4. Start it with both files:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
   ```

   To avoid typing both files every time, add this line to `.env`:
   `COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml` (use `;` instead of `:` on
   Windows). After that, plain `docker compose ...` commands use both.

5. Open `https://livros.example.pt`. The certificate is ready within a minute of the DNS record
   resolving. With this setup, port 3000 is no longer exposed: all traffic goes through Caddy,
   and plain `http://` redirects to `https://`.

If you already run a reverse proxy (nginx, Traefik, Cloudflare Tunnel), skip the HTTPS file:
- Point your proxy at port 3000.
- Set `PUBLIC_URL=https://your-domain`.
- Make sure the proxy passes the original `Host` header through.

## Emails (password resets)

Without email settings, the site still works. When someone asks to reset their password, the
link is written to the server log instead of being emailed. As admin, you can find it with:

```bash
docker compose logs app | grep -A6 "email não enviado"
```

To send real emails, set `SMTP_URL` to your provider's SMTP address and `MAIL_FROM` to the
sender. Any provider works: Brevo, Mailgun, Amazon SES, Fastmail, or your own mail server.

```ini
SMTP_URL=smtps://USERNAME:PASSWORD@smtp.example.com:465
MAIL_FROM="Entre Páginas <no-reply@example.pt>"
```

If the username or password contains special characters (`@`, `:`, `/`), URL-encode them; for
example, `@` becomes `%40`. Use port 465 with `smtps://`, or 587 with `smtp://`.

## Sign in with Google

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an
   **OAuth client ID** of type *Web application*.
2. Add this authorised redirect URI:
   `https://YOUR-DOMAIN/api/auth/callback/google`, or
   `http://localhost:3000/api/auth/callback/google` for local use.
3. Put the client ID and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then
   run `docker compose up -d`.

## Day-to-day

Run these from the project folder. If you use the HTTPS setup without `COMPOSE_FILE` in `.env`,
add `-f docker-compose.yml -f docker-compose.https.yml` after `docker compose`.

| Task | Command |
| --- | --- |
| See if it's running | `docker compose ps` |
| Watch the logs | `docker compose logs -f app` (Ctrl+C stops watching, not the site) |
| Stop | `docker compose stop` |
| Start again | `docker compose start` |
| Apply changed settings | `docker compose up -d` |

### Updating to a new version

```bash
git pull                       # or download the new ZIP over the old folder (keep your .env)
docker compose up -d --build
```

Database changes apply on their own when the site starts, and your accounts, reviews and books
are kept. The catalogue snapshot is only loaded on the very first start; after that, the books
you have are the ones you imported.

### Adding books

Search for a book on the site. If it isn't in the catalogue yet, the results from Open Library
show an **Importar** button. You need to be signed in.

### Backups

All data (accounts, shelves, reviews, imported books, corrections) is in the database. To make a
backup file `entre-paginas.dump` in the current folder:

```bash
docker compose exec db pg_dump -U entrepaginas -Fc -f /tmp/backup.dump entrepaginas
docker compose cp db:/tmp/backup.dump ./entre-paginas.dump
```

To restore it, on the same or another machine, after `docker compose up -d`:

```bash
docker compose cp ./entre-paginas.dump db:/tmp/backup.dump
docker compose exec db pg_restore -U entrepaginas -d entrepaginas --clean --if-exists /tmp/backup.dump
```

These commands work the same in PowerShell, Terminal and Linux shells. Restoring on a new machine
keeps everyone's accounts and passwords, but each reader has to sign in again unless you copied
the same `BETTER_AUTH_SECRET`.

### Starting over

This **deletes all data** (accounts, reviews, imported books), then starts fresh from the
snapshot:

```bash
docker compose down -v
docker compose up -d
```

## Troubleshooting

**"Cannot connect to the Docker daemon" / "docker: command not found".** Docker Desktop isn't
running, or isn't installed. Start it and try again. On Linux, either add yourself to the
`docker` group (then log out and back in) or use `sudo`.

**"port is already allocated" / "address already in use".** Something else is using port 3000
(or 5433). Pick another one in `.env`, for example `PORT=8080` or `DB_PORT=5434`, then run
`docker compose up -d` again.

**Sign-in or sign-up fails with "Este endereço do site não está autorizado".** You're opening
the site at a name that is neither `PUBLIC_URL` nor a local-network address, for example a
hostname from your router or a VPN. Add that address to `TRUSTED_ORIGINS`, or set `PUBLIC_URL`
to it. Also check you didn't mix up `http` and `https`.

**The build stops with "killed" or "out of memory".** The machine has less than about 2 GB free.
On Docker Desktop, raise the memory limit in Settings → Resources. On a small server, add swap
space, then run `docker compose up -d --build` again.

**"set: illegal option -" or "exec format error" in the app logs.** The files were saved with
Windows line endings. This is handled automatically, but an old download may not have the fix.
Download the latest version, or run `git config --global core.autocrlf input` and clone again.

**Importing a book fails.** Open Library and Wikidata are sometimes slow or briefly down. Wait a
minute and try again. `docker compose logs app` shows the reason.

**Forgot the admin password.** Use *Esqueci-me da palavra-passe* on the sign-in page. Without
email set up, the reset link is in the logs (see [Emails](#emails-password-resets)).

**HTTPS certificate isn't issued.** Check the following, then look at
`docker compose logs caddy`:
- the domain's DNS points at this server (`nslookup your-domain`);
- ports 80 and 443 are open;
- nothing else on the server is using them.

Let's Encrypt limits retries, so fix the cause before restarting many times.
