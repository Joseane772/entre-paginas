#!/bin/bash
# Entre Páginas: arranca o site e abre-o no browser (Linux).
# Uso: ./iniciar-linux.sh   (ou duplo clique, se o gestor de ficheiros permitir executar scripts)

cd "$(dirname "$0")" || exit 1

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
  echo "  O Docker não está instalado."
  echo "  Instala-o seguindo https://docs.docker.com/engine/install/ e volta a correr este ficheiro."
  fim 1
fi

if ! docker info >/dev/null 2>&1; then
  if docker info 2>&1 | grep -qi "permission denied"; then
    echo "  O teu utilizador ainda não pode usar o Docker. Corre isto uma vez e depois reinicia a sessão:"
    echo "      sudo usermod -aG docker \$USER"
    fim 1
  fi
  echo "  O Docker não está a correr. A tentar arrancá-lo (pode pedir a tua palavra-passe)..."
  systemctl --user start docker-desktop >/dev/null 2>&1 || sudo systemctl start docker
  for _ in $(seq 60); do docker info >/dev/null 2>&1 && break; sleep 3; done
  if ! docker info >/dev/null 2>&1; then
    echo "  Não foi possível arrancar o Docker. Abre o Docker Desktop (ou arranca o serviço docker) e tenta outra vez."
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

IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')
echo
echo "  Pronto! O Entre Páginas está a funcionar."
echo
echo "  Neste computador:            http://localhost:$PORTA"
[ -n "$IP" ] && echo "  Noutros aparelhos da casa:   http://$IP:$PORTA"
echo
echo "  Para desligar, usa parar-linux.sh. Fechar esta janela não desliga o site."
command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:$PORTA" >/dev/null 2>&1 &
fim 0
