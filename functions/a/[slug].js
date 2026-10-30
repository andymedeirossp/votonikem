// Cloudflare Pages: /a/<slug>
// Entrega a página anuncio.html já com título, descrição e imagem do anúncio nas tags
// Open Graph, para o WhatsApp, o Instagram e o Facebook mostrarem a prévia do anunciante
// (eles não executam JavaScript). O resto da página é preenchido no navegador por js/anuncio.js.
import { buscarAnuncio, escaparHtml, metaAnuncio, slugValido } from "../../lib/anuncio.js";

const trocarConteudo = (valor) => ({ element: (el) => el.setAttribute("content", valor) });

export async function onRequestGet({ params, request, env }) {
  const url = new URL(request.url);
  const slug = String(params.slug || "").toLowerCase();
  // Modo manutenção (scripts/build.mjs): anúncios fora do ar, leva para a página inicial
  if ((await env.ASSETS.fetch(new URL("/manutencao.txt", url))).ok) return Response.redirect(new URL("/", url), 302);
  const modelo = await env.ASSETS.fetch(new URL("/anuncio", url));
  const cabecalhos = new Headers(modelo.headers);
  cabecalhos.set("Content-Type", "text/html; charset=utf-8");

  let a = null;
  try {
    a = slugValido(slug) ? await buscarAnuncio(slug, env.SUPABASE_URL_TESTE) : null;
  } catch (err) {
    // Sem o banco, entrega a página genérica; o navegador tenta carregar de novo
    console.error("Prévia do anúncio:", err.message);
    cabecalhos.set("Cache-Control", "no-store");
    return new Response(modelo.body, { headers: cabecalhos });
  }

  if (!a) {
    cabecalhos.set("Cache-Control", "public, max-age=60");
    return new HTMLRewriter()
      .on('meta[name="robots"]', trocarConteudo("noindex"))
      .transform(new Response(modelo.body, { status: 404, headers: cabecalhos }));
  }

  const m = metaAnuncio(a, url.origin);
  cabecalhos.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(`${m.titulo} | VotoniKem`) })
    .on('meta[name="description"]', trocarConteudo(m.descricao))
    .on('meta[property="og:type"]', trocarConteudo("profile"))
    .on('meta[property="og:title"]', trocarConteudo(m.titulo))
    .on('meta[property="og:description"]', trocarConteudo(m.descricao))
    .on('meta[property="og:image"]', trocarConteudo(m.imagem))
    .on("head", {
      element: (el) => el.append([
        `<meta property="og:url" content="${escaparHtml(m.endereco)}">`,
        `<meta property="og:image:alt" content="${escaparHtml(m.imagemAlt)}">`,
        `<meta name="twitter:title" content="${escaparHtml(m.titulo)}">`,
        `<meta name="twitter:description" content="${escaparHtml(m.descricao)}">`,
        `<meta name="twitter:image" content="${escaparHtml(m.imagem)}">`,
        `<link rel="canonical" href="${escaparHtml(m.endereco)}">`
      ].join("\n  ") + "\n", { html: true })
    })
    .transform(new Response(modelo.body, { headers: cabecalhos }));
}
