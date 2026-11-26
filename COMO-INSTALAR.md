# Como pôr o Entre Páginas a funcionar no teu computador

Este guia é para quem nunca fez nada disto. Não precisas de saber programar nem de escrever
comandos: vais instalar um programa, transferir uma pasta e fazer duplo clique num ficheiro.

Na primeira vez demora cerca de **30 minutos**, quase todos à espera que o computador trate das
coisas sozinho. Depois disso, ligar o site é um duplo clique e uns segundos.

**Índice**

1. [O que vais precisar](#o-que-vais-precisar)
2. [Passo 1: instalar o Docker Desktop](#passo-1-instalar-o-docker-desktop)
3. [Passo 2: transferir o Entre Páginas](#passo-2-transferir-o-entre-páginas)
4. [Passo 3: ligar o site](#passo-3-ligar-o-site)
5. [Passo 4: criar a tua conta](#passo-4-criar-a-tua-conta)
6. [Passo 5: deixar outras pessoas da casa usar o site](#passo-5-deixar-outras-pessoas-da-casa-usar-o-site)
7. [Desligar e voltar a ligar](#desligar-e-voltar-a-ligar)
8. [Instalar uma versão nova](#instalar-uma-versão-nova)
9. [Se alguma coisa correr mal](#se-alguma-coisa-correr-mal)

---

## O que vais precisar

- Um computador com **Windows 10 ou 11**, um **Mac**, ou **Linux**.
- **Ligação à internet.**
- Cerca de **3 GB livres** no disco.
- No Windows, pode ser preciso **reiniciar o computador** uma vez durante a instalação.

O site fica a funcionar **no teu computador**. Para outras pessoas o usarem, o teu computador
tem de estar ligado.

---

## Passo 1: instalar o Docker Desktop

**O que é?** O Docker Desktop é um programa gratuito (para uso pessoal) que faz o site funcionar
dentro do teu computador, sem teres de instalar mais nada. Só o instalas uma vez.

### No Windows

1. Abre esta página no browser: **https://www.docker.com/products/docker-desktop/**
2. Carrega no botão **Download for Windows**. Se te perguntar qual versão, escolhe
   **AMD64** (é a da maioria dos computadores).
3. Abre a pasta **Transferências** e faz duplo clique no ficheiro **Docker Desktop Installer**.
4. Se aparecer *"Quer permitir que esta aplicação faça alterações ao seu dispositivo?"*, carrega
   em **Sim**.
5. Deixa as opções como estão e carrega em **OK**. Espera que a instalação acabe (alguns minutos).
6. No fim, carrega em **Close and restart** (fechar e reiniciar). O computador reinicia.
7. Depois de reiniciar, o Docker Desktop abre sozinho. Se não abrir, procura **Docker Desktop**
   no menu Iniciar.
8. Vai aparecer um contrato: carrega em **Accept** (aceitar).
9. Se te pedir para criar conta ou entrar, carrega em **Skip** (saltar). Não precisas de conta.
   Se fizer perguntas sobre ti, também podes saltar.
10. Se aparecer uma mensagem sobre o **WSL** a pedir uma atualização, carrega no botão que ela
    indicar e espera (pode pedir para reiniciar outra vez).
11. Está pronto quando, no canto inferior esquerdo da janela do Docker, aparecer
    **Engine running** com uma bolinha verde. Podes fechar essa janela: o Docker continua a
    funcionar (vês o ícone de uma baleia ao lado do relógio).

### No Mac

1. Descobre que tipo de Mac tens: carrega no menu **** (canto superior esquerdo) →
   **Acerca deste Mac**. Se disser **Chip Apple M1, M2, M3...**, é *Apple Silicon*. Se disser
   **Processador Intel**, é *Intel*.
2. Abre **https://www.docker.com/products/docker-desktop/**, carrega em **Download for Mac** e
   escolhe **Apple Silicon** ou **Intel**, conforme o passo anterior.
3. Abre a pasta **Transferências** e faz duplo clique em **Docker.dmg**.
4. Na janela que aparece, **arrasta a baleia para a pasta Aplicações**.
5. Abre a pasta **Aplicações** e faz duplo clique em **Docker**. Se o Mac perguntar se tens a
   certeza, carrega em **Abrir**.
6. Carrega em **Accept** (aceitar). Se pedir a palavra-passe do Mac, escreve-a.
7. Se te pedir para criar conta ou entrar, carrega em **Skip** (saltar).
8. Está pronto quando aparecer **Engine running** com uma bolinha verde. Podes fechar a janela:
   o Docker continua a funcionar (ícone da baleia na barra de cima).

### No Linux

Instala o Docker seguindo as instruções para a tua distribuição em
**https://docs.docker.com/engine/install/**. Depois, para o poderes usar sem `sudo`:
`sudo usermod -aG docker $USER`, e termina e volta a iniciar a sessão.

---

## Passo 2: transferir o Entre Páginas

1. Abre esta página: **https://github.com/Joseane772/entre-paginas**
2. Carrega no botão verde **<> Code** e depois em **Download ZIP**.
3. Abre a pasta **Transferências** e encontra o ficheiro **entre-paginas-main.zip**.
4. Descompacta-o:
   - **Windows:** clica com o botão direito no ficheiro → **Extrair tudo...** → **Extrair**.
   - **Mac:** faz duplo clique no ficheiro.
5. Fica uma pasta chamada **entre-paginas-main**. Podes deixá-la onde está ou movê-la para outro
   sítio (por exemplo, para Documentos). **Não apagues esta pasta**: é a partir dela que ligas o
   site.

---

## Passo 3: ligar o site

Abre a pasta **entre-paginas-main**. Lá dentro há vários ficheiros; só precisas de um:

| O teu computador | Faz duplo clique em |
| --- | --- |
| Windows | **Iniciar-Windows** (ou *Iniciar-Windows.bat*) |
| Mac | **Iniciar-Mac** (ou *Iniciar-Mac.command*) |
| Linux | **iniciar-linux.sh** |

**Da primeira vez, o computador pode desconfiar do ficheiro**, porque veio da internet. É normal:

- **Windows:** aparece uma janela azul *"O Windows protegeu o computador"*. Carrega em
  **Mais informações** e depois em **Executar mesmo assim**.
- **Mac:** em vez de duplo clique, clica com o **botão direito** (ou Control + clique) no ficheiro
  → **Abrir** → **Abrir**. Se mesmo assim não deixar, vai a **Definições do Sistema →
  Privacidade e segurança**, desce até ao fim e carrega em **Abrir mesmo assim**.
- **Linux:** clica com o botão direito → **Executar como programa** (ou, num terminal dentro da
  pasta, escreve `./iniciar-linux.sh`).

Abre-se uma **janela com texto**. Da primeira vez, demora **5 a 10 minutos**: vais ver muitas linhas
a passar enquanto o site é preparado. É normal. **Não feches a janela.**

Quando aparecer **Pronto!**, o browser abre sozinho com o site. Se não abrir, escreve no browser:
**http://localhost:3000**

---

## Passo 4: criar a tua conta

1. No site, carrega em **Entrar** (canto superior direito) e depois em **Criar conta**.
2. Escreve o teu nome, o teu email e uma palavra-passe com pelo menos 8 caracteres.
3. Carrega em **Criar conta**.

**A primeira conta criada é a do administrador.** Vais ver a ligação **Admin**, onde podes
corrigir dados dos livros, ver quem tem conta e criar contas para outras pessoas.

O site já traz algumas dezenas de livros. Para juntar outros, pesquisa o título: se ainda não
estiver no catálogo, aparece um botão **Importar**.

---

## Passo 5: deixar outras pessoas da casa usar o site

Qualquer pessoa ligada **ao mesmo Wi-Fi** (ou à mesma rede) pode usar o site e criar a sua conta.

1. Na janela de texto do Passo 3, procura a linha **Noutros aparelhos da casa**. Tem um endereço
   parecido com **http://192.168.1.20:3000**.
2. Dá esse endereço às outras pessoas. Elas escrevem-no no browser do telemóvel ou do computador
   (exatamente assim, com o `:3000` no fim).
3. Depois carregam em **Entrar → Criar conta**.

**No Windows**, da primeira vez pode aparecer um aviso da firewall a perguntar se o Docker pode
comunicar na rede. Marca **Redes privadas** e carrega em **Permitir acesso**.

Lembra-te: o **teu computador tem de estar ligado** e o site a funcionar para os outros o usarem.

---

## Desligar e voltar a ligar

- **Desligar o site:** duplo clique em **Parar-Windows**, **Parar-Mac** ou **parar-linux.sh**.
- **Voltar a ligar:** duplo clique em **Iniciar** outra vez. Desta vez demora segundos.
- **Fechar a janela de texto não desliga o site.** Desligar o computador desliga-o; quando o
  voltares a ligar, usa outra vez o **Iniciar**.

As contas, as estantes e os livros ficam sempre guardados, mesmo quando desligas.

---

## Instalar uma versão nova

1. Desliga o site (**Parar**).
2. Transfere o ZIP outra vez (Passo 2) e descompacta-o. Podes apagar a pasta antiga.
3. Liga o site com o **Iniciar** da pasta nova. Pode demorar alguns minutos, porque prepara a
   versão nova.

**Os teus dados mantêm-se**: contas, estantes, opiniões e livros importados não estão dentro da
pasta, estão guardados pelo Docker.

---

## Se alguma coisa correr mal

**A janela diz que o Docker Desktop não está instalado.**
Volta ao [Passo 1](#passo-1-instalar-o-docker-desktop).

**A janela diz que o Docker Desktop não arrancou.**
Abre o Docker Desktop (menu Iniciar no Windows, pasta Aplicações no Mac), espera que apareça
**Engine running** e volta a fazer duplo clique no **Iniciar**.

**Aparece "port is already allocated" ou "address already in use".**
Outro programa já está a usar a porta do site. A solução mais simples é reiniciar o computador e
tentar outra vez. Se continuar, usa outra porta:
1. Abre o **Bloco de Notas** (Windows) ou o **TextEdit** (Mac; em *Formatar*, escolhe
   *Converter em texto simples*).
2. Escreve só isto: `PORT=8080`
3. Guarda o ficheiro **dentro da pasta entre-paginas-main** com o nome **.env** (começa com um
   ponto). No Bloco de Notas, em *Guardar com o tipo*, escolhe **Todos os ficheiros**.
4. Volta a fazer duplo clique no **Iniciar**. O site passa a estar em
   **http://localhost:8080**.

**Aparece "killed" ou "out of memory" na primeira vez.**
O computador ficou sem memória. Fecha os outros programas (sobretudo o browser com muitos
separadores) e volta a fazer duplo clique no **Iniciar**. No Docker Desktop, em **Settings →
Resources**, podes dar-lhe mais memória (4 GB chegam).

**As outras pessoas não conseguem abrir o site.**
- Confirma que estão ligadas ao **mesmo Wi-Fi** que o teu computador.
- Confirma que escreveram o endereço completo, com o **:3000** no fim.
- No Windows, a firewall pode estar a bloquear: procura **Firewall do Windows Defender** no menu
  Iniciar → **Permitir uma aplicação através da Firewall** → confirma que o **Docker Desktop
  Backend** tem **Privada** marcada.

**Alguém se esqueceu da palavra-passe.**
Na página **Entrar** há a ligação **Esqueci-me da palavra-passe**. Como este site ainda não envia
emails, a ligação para escolher uma nova palavra-passe fica guardada no Docker. Para a veres:
abre o Docker Desktop → **Containers** → **entre-paginas** → **app** → separador **Logs**, e
procura a mensagem **email não enviado**. Copia a ligação que está por baixo e envia-a à pessoa.
Se a pessoa a for abrir noutro aparelho, troca `localhost` na ligação pelo endereço da casa (o
número da linha **Noutros aparelhos da casa**, por exemplo `192.168.1.20`).

**Quero apagar tudo e começar do zero.**
Desliga o site (**Parar**). No Docker Desktop, vai a **Volumes**, seleciona os que começam por
**entre-paginas** e apaga-os. No próximo **Iniciar**, o site volta ao estado inicial. **Isto apaga
todas as contas e estantes.**

---

## Para ir mais longe

Para pôr o site na internet com um domínio teu, enviar emails a sério, entrar com Google ou fazer
cópias de segurança, vê o [guia completo de alojamento](docs/ALOJAMENTO.md). Esse guia já usa
comandos num terminal.
