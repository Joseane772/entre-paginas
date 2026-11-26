#!/bin/bash
# Entre Páginas: desliga o site (Linux). Os dados ficam guardados.
cd "$(dirname "$0")" || exit 1
echo
echo "  A desligar o Entre Páginas..."
docker compose stop
echo
echo "  Desligado. Os teus dados ficam guardados; para voltar a ligar usa iniciar-linux.sh."
echo
read -r -p "Carrega em Enter para fechar esta janela." _
