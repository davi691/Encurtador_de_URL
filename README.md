# Linka — encurtador de URL com domínio próprio

## Arquivos

- `index.html` — estrutura da página
- `style.css` — visual (tema escuro, fonte Space Grotesk/Inter/JetBrains Mono)
- `script.js` — lógica do front-end (funciona sozinho, salvando no navegador via `localStorage`)
- `server.js` — servidor Node.js/Express que faz o redirecionamento **de verdade**, para qualquer visitante
- `links.json` — criado automaticamente pelo servidor para guardar os links

## Opção 1 — só testar o visual (sem servidor)

Abra `index.html` direto no navegador. O formulário, a animação e o histórico
funcionam, mas os links só existem no seu navegador — ninguém mais consegue
acessar `lnk.suamarca.com/codigo` e ser redirecionado.

## Opção 2 — funcionando de verdade com seu domínio

1. Instale o [Node.js](https://nodejs.org).
2. Na pasta do projeto:
   ```bash
   npm init -y
   npm install express
   node server.js
   ```
3. Acesse `http://localhost:3000` — agora o front-end conversa com o servidor.
4. Para o front-end usar a API real em vez do `localStorage`, troque as chamadas
   de `loadLinks/saveLinks` em `script.js` por `fetch("/api/shorten", { method: "POST", ... })`
   apontando para o `server.js`. (Deixamos a versão simples com `localStorage`
   pronta para você ver o visual funcionando imediatamente; a ligação com a API
   é a próxima etapa quando for para produção.)

## Colocando o domínio próprio no ar

1. **Hospede o servidor** em algum lugar que rode Node.js continuamente:
   Railway, Render, Fly.io, um VPS (DigitalOcean, EC2), etc.
2. **Aponte o domínio**: no seu provedor de DNS, crie um registro `A` (ou `CNAME`)
   para o endereço IP (ou host) do serviço que hospeda o `server.js`.
   Exemplo: `lnk.suamarca.com` → IP do servidor.
3. **HTTPS**: use um proxy como Caddy, Nginx + Certbot, ou deixe o próprio
   provedor (Railway/Render) emitir o certificado automaticamente.
4. Pronto: qualquer link gerado como `lnk.suamarca.com/abc123` vai bater no
   `server.js`, que redireciona para a URL original.

## Trocar o domínio exibido no site

No campo "seu domínio" no topo da página, digite o domínio que você configurou
(ex: `lnk.suamarca.com`). Ele fica salvo no navegador e é usado para montar os
links exibidos.

## Escalando

Para uso pessoal ou de um projeto pequeno, o arquivo `links.json` é suficiente.
Para tráfego maior, troque `readDB`/`writeDB` em `server.js` por um banco de
dados real (Postgres, SQLite, Redis) — a lógica de geração de código e
redirecionamento continua a mesma.
