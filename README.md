# 🎲 Roleta de Tabuleiro

App web para selecionar, filtrar e sortear sua coleção de jogos de tabuleiro — visual inspirado na **Ludopedia** (verde + acento laranja, fontes Nunito/Open Sans).

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Para gerar a versão final (pasta `dist/`):

```bash
npm run build
npm run preview
```

### Acessar de outro dispositivo na mesma rede

Com `npm run dev` rodando, abra no celular (mesmo Wi-Fi): `http://SEU_IP:5173`
(ex.: `http://192.168.0.59:5173`). Se não abrir, libere a porta no Firewall do Windows
(marque "Redes privadas" no aviso do Node, ou crie uma regra de entrada para a porta 5173).

## App Android (APK)

O projeto já está configurado com **Capacitor** (pasta `android/`). As capas ficam
embarcadas no APK (funcionam offline) e a busca na Ludopedia usa requisição nativa.

### Opção A — Build na nuvem (sem instalar nada)

Há um workflow do GitHub Actions em `.github/workflows/android.yml`. Suba o projeto
para um repositório no GitHub e:

1. Vá em **Actions → Build Android APK → Run workflow** (ou faça um push na `main`).
2. Ao terminar, baixe o APK em **Artifacts → roleta-tabuleiro-apk**.
3. Transfira para o celular e instale (permita "fontes desconhecidas").

### Opção B — Build local

Pré-requisitos: **JDK 17** e **Android Studio** (ou Android SDK + variável `ANDROID_HOME`).

```bash
npm run android      # build web + sync + abre no Android Studio (Run ▶ gera/instala o app)
# ou, por linha de comando (gera APK de debug):
npm run apk
# APK em: android/app/build/outputs/apk/debug/app-debug.apk
```

Sempre que mudar o código web, rode `npm run sync` antes de gerar o APK de novo.

## Funcionalidades

- **Busca** por nome, estilo, editora e palavras-chave (campo no topo).
- **Filtros** (botão ⚙ Filtros) por:
  - Categoria / estilo (Party, Cooperativo, Família, Cartas, Dedução…)
  - Tipo (Base / Expansão)
  - Nº de jogadores
  - Duração máxima
  - Idade mínima
  - Só favoritos ⭐
- **Ordenação** por nota, ranking Ludopedia, nome ou duração.
- **Lista** com foto + informações principais de cada jogo.
- **🎡 Roleta**: sorteia um jogo aleatório **respeitando os filtros ativos** (filtre "cooperativo, 4 jogadores" e a roleta sorteia só entre esses).
- **Adicionar / editar / excluir** jogos (✎ e 🗑 nos cards, "+ Adicionar" no topo).
  - Ao adicionar, digite o nome e clique **🔎 Ludopedia** para buscar automaticamente
    capa, nota, ranking, idade, tempo e nº de jogadores direto da Ludopedia.
- **Clicar no jogo** abre os detalhes completos em um pop-up.
- **Histórico de partidas** (📜): botão "🎲 Joguei" registra a partida; veja contagem por jogo e quais ainda não jogou.
- Tudo é salvo localmente no navegador (`localStorage`). "Restaurar coleção original" (rodapé) volta ao arquivo inicial.
- **💾 Backup**: exporta/importa todos os seus dados (jogos, favoritos, histórico) em um
  arquivo JSON. Guarde-o no Drive/e-mail para **não perder nada ao reinstalar o app** ou
  trocar de aparelho. No Android o backup automático do Google também está habilitado.

## Imagens dos jogos (BoardGameGeek)

O arquivo de dados não vem com fotos. Para buscá-las automaticamente no BGG:

```bash
npm run enrich
```

> ⚠️ Rode na **sua máquina** (IP residencial). A API do BGG bloqueia IPs de datacenter.
> O script só busca jogos sem imagem; use `npm run enrich -- --force` para refazer tudo.

Enquanto não houver imagem, o card mostra um **placeholder colorido** com a inicial do jogo.
Você também pode colar uma **URL de imagem** manualmente ao editar qualquer jogo.

## Atualizar a base a partir do JSON original

O app parte de `src/data/games.json`, gerado do seu arquivo:

```bash
node scripts/build-data.mjs ../jogos_de_tabuleiro.json
```

## Estrutura

```
src/
  data/games.json        # sua coleção (base do app)
  lib/                    # helpers + persistência (localStorage)
  components/             # GameCard, Filters, Roleta, Formulário, Histórico
  App.jsx                 # tela principal
scripts/
  build-data.mjs          # converte o JSON original
  enrich-images.mjs       # busca capas no BGG
```
