#!/bin/bash
# Entre Páginas: desliga o site (macOS). Os dados ficam guardados.
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
echo
echo "  A desligar o Entre Páginas..."
docker compose stop
echo
echo "  Desligado. Os teus dados ficam guardados; para voltar a ligar abre Iniciar-Mac.command."
echo
read -r -p "Carrega em Enter para fechar esta janela." _
