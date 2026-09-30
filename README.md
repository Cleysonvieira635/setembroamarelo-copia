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

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica o site gratuitamente em `https://setembroamarelo.github.io/`. O repositório especial `setembroamarelo/setembroamarelo.github.io` já está configurado para publicar pela origem **GitHub Actions**; novos commits em `main` atualizam o site.

O GitHub Pages hospeda a interface estática gratuitamente. O backend da API pode ser publicado como Cloudflare Worker e usa D1 para guardar mensagens, curtidas e unidades.

## Backend Cloudflare Workers + D1

Para publicar a API sem Render:

1. Instale/execute o Wrangler com `npx wrangler login` e autentique sua conta Cloudflare no navegador.
2. Crie o banco com `npx wrangler d1 create setembroamarelo-db` e copie o `database_id` retornado para `wrangler.jsonc`, substituindo o identificador de exemplo.
3. Aplique a migração inicial com `npm run cf:d1:migrate`.
4. Publique o Worker com `npm run cf:deploy` e anote a URL `workers.dev` exibida.
5. Configure `API_BASE_URL` nas variáveis do repositório GitHub com a origem HTTPS do Worker. O workflow reconstruirá o Pages conectado à API no próximo push.
6. Opcionalmente, configure a chave Gemini como segredo com `npx wrangler secret put GEMINI_API_KEY`. Sem ela, o chat usa orientação padrão e o mural não aceita novas publicações moderadas.

O plano gratuito atual inclui 100 mil chamadas Worker por dia; D1 inclui 5 milhões de linhas lidas por dia, 100 mil escritas por dia e 5 GB de armazenamento. Cotas excedidas podem suspender consultas até a renovação diária.

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
