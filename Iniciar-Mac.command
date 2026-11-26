#!/bin/bash
# Entre Páginas: arranca o site e abre-o no browser (macOS). Duplo clique no Finder.

cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

fim() {
  echo
  read -r -p "Carrega em Enter para fechar esta janela." _
  exit "${1:-0}"
}

PORTA=$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"[:space:]')
PORTA=${PORTA:-3000}

echo
echo "  Entre Páginas"
echo "  -------------"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "  O Docker Desktop não está instalado."
  echo "  Vou abrir a página de transferência. Instala-o, abre-o uma vez e volta a abrir este ficheiro."
  open "https://www.docker.com/products/docker-desktop/"
  fim 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "  A abrir o Docker Desktop. Espera um pouco..."
  open -a Docker
  for _ in $(seq 60); do docker info >/dev/null 2>&1 && break; sleep 3; done
  if ! docker info >/dev/null 2>&1; then
    echo "  O Docker Desktop não arrancou. Abre-o à mão (Aplicações → Docker), espera que diga"
    echo "  que está a correr, e volta a abrir este ficheiro."
    fim 1
  fi
fi

echo "  A arrancar o site. Da primeira vez pode demorar até 10 minutos; depois, segundos."
echo
if ! docker compose up -d --build; then
  echo
  echo "  Algo correu mal. Lê as mensagens acima ou consulta COMO-INSTALAR.md, secção «Se alguma coisa correr mal»."
  fim 1
fi

echo
echo "  A preparar o site..."
for _ in $(seq 100); do
  curl -sf -o /dev/null "http://localhost:$PORTA" && break
  sleep 3
done

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo
echo "  Pronto! O Entre Páginas está a funcionar."
echo
echo "  Neste computador:            http://localhost:$PORTA"
[ -n "$IP" ] && echo "  Noutros aparelhos da casa:   http://$IP:$PORTA"
echo
echo "  Para desligar, abre Parar-Mac.command. Fechar esta janela não desliga o site."
open "http://localhost:$PORTA"
fim 0
