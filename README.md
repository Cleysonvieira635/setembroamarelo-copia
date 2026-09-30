# Acolher & Ouvir

Site educativo de conscientização sobre saúde emocional e prevenção ao suicídio. Inclui conteúdo informativo, chat de orientação, mural moderado e busca de unidades cadastradas.

## Requisitos

- Node.js 18 ou superior
- npm

## Executar

Na pasta do projeto, execute:

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Use o servidor; abrir o HTML diretamente não disponibiliza as rotas da API.

## Configuração

O arquivo `.env.example` contém o modelo de configuração local. Copie-o para `.env`, insira sua chave em `GEMINI_API_KEY` e reinicie o servidor para ativar respostas e moderação com Gemini. Não compartilhe nem versione o arquivo `.env`. Sem chave, o chat apresenta uma orientação padrão e a publicação no mural fica indisponível, pois requer moderação.

O banco SQLite é criado automaticamente em `data/acolher-ouvir.sqlite`. Mensagens, curtidas e unidades ficam persistidas entre reinicializações. As unidades podem ser cadastradas pela variável opcional `HEALTH_UNITS_JSON`. Cadastre apenas locais e contatos confirmados. Exemplo:

```json
[{"name":"CAPS municipal","address":"Endereço confirmado","phone":"Telefone público","type":"CAPS","city":"Sua cidade"}]
```

A busca consulta nome, endereço, cidade e tipo. Sem unidades configuradas, o site orienta o visitante a procurar os serviços municipais.

## Publicar no GitHub Pages e Render

O workflow `.github/workflows/deploy-pages.yml` publica a interface em `https://setembroamarelo.github.io/`. Para ativar:

1. Envie o projeto para o repositório especial `setembroamarelo/setembroamarelo.github.io` e habilite Pages com a origem **GitHub Actions** nas configurações do repositório.
2. Crie o serviço do backend no Render usando `render.yaml`. Na primeira configuração, informe `GEMINI_API_KEY` diretamente no painel do Render.
3. Use um plano pago do Render que permita disco persistente. O banco SQLite é montado em `/var/data`; sem esse disco as mensagens podem ser perdidas em reinícios ou novos deploys.
4. No GitHub, crie a variável de repositório `API_BASE_URL` com a URL HTTPS do serviço Render, por exemplo `https://acolher-ouvir-api.onrender.com`.
5. Envie um commit para `main` ou `master`. O workflow publica a interface; o Render publica a API.

O GitHub Pages hospeda somente os arquivos estáticos. Chat, mural e busca dependem do serviço backend no Render. O backend permite CORS apenas para `https://setembroamarelo.github.io`, conforme `CORS_ORIGINS` em `render.yaml`.

As artes SVG ficam em `materials/social`. Para gerar cópias físicas dos downloads do site em `materials/downloads`, execute `npm run materials:generate`.

## Rotas

- `GET /api/health`: verifica se o servidor está ativo
- `GET /api/units?search=...`: pesquisa unidades cadastradas
- `GET /api/mural`: lista mensagens
- `POST /api/mural`: publica uma mensagem moderada (`{"text":"..."}`)
- `POST /api/mural/:id/like`: registra acolhimento
- `POST /api/chat`: envia uma mensagem ao assistente (`{"userMessage":"..."}`)
- `GET /downloads/kit-redes-sociais.zip`: baixa três artes vetoriais para redes sociais
- `GET /downloads/cartazes-a3-a4.pdf`: baixa cartazes nas versões A3 e A4
- `GET /downloads/guia-lideranca.pdf`: baixa o guia de acolhimento para lideranças
- `GET /materiais/...`: serve as artes usadas nas prévias dos materiais

Este site não substitui psicólogos, serviços de saúde ou atendimento de emergência. Em sofrimento emocional, ligue 188 (CVV); em risco imediato, ligue 192 (SAMU) ou procure um pronto atendimento.
