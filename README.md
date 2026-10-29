# VotoniKem

Site estático do VotoniKem, publicado na Vercel a partir da branch `main`.
A branch `melhorias` gera uma prévia antes de ir ao ar.

## Estrutura

- `index.html`: página principal
- `politica-de-privacidade.html`, `termos-de-uso.html`, `codigo-de-conduta.html`: documentos (também abrem em janela no site)
- `css/tailwind.css`: estilos gerados pelo Tailwind (não editar à mão)
- `css/styles.css`: estilos próprios do site
- `js/config.js`: configurações públicas (Supabase, PIX, meta de arrecadação)
- `js/main.js`: formulário, PIX, janelas e banner de cookies
- `js/kit.js`, `js/mapa.js`, `js/cards3d.js`, `js/confete.js`, `js/intro.js`, `js/menu.js`: recursos visuais
- `supabase/schema.sql`: estrutura do banco (referência; já aplicada)

## Ao mudar classes do Tailwind no HTML ou nos scripts

O CSS contém só as classes usadas no site. Depois de adicionar classes novas, gere o arquivo de novo:

```
npm install
npm run css
```

E inclua o `css/tailwind.css` atualizado no commit.

## Créditos

Mapa do Brasil: [MapSVG](https://mapsvg.com/maps/brazil), via `@svg-maps/brazil`, licença CC BY 4.0.
