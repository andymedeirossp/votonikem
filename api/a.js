// /a/<slug> → esta função. Entrega a mesma página anuncio.html, mas já com título,
// descrição e imagem do anúncio nas tags Open Graph. Assim o WhatsApp, o Instagram
// e o Facebook mostram uma prévia do anunciante (eles não executam JavaScript).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { buscarAnuncio, escaparHtml, logoConfiavel, metaAnuncio, slugValido } from "../lib/anuncio.js";

let modelo;
const lerModelo = () => (modelo ??= readFileSync(join(process.cwd(), "anuncio.html"), "utf8"));

const trocarMeta = (html, chave, valor) => {
  const v = escaparHtml(valor);
  const re = new RegExp(`(<meta (?:property|name)="${chave}" content=")[^"]*(")`);
  return re.test(html)
    ? html.replace(re, (_, a, b) => `${a}${v}${b}`)
    : html.replace("</head>", () => `  <meta ${chave.startsWith("og:") ? "property" : "name"}="${chave}" content="${v}">\n</head>`);
};

export async function GET(request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") || "").toLowerCase();
  let html = lerModelo();
  const cabecalhos = { "Content-Type": "text/html; charset=utf-8" };

  let a = null;
  try {
    a = slugValido(slug) ? await buscarAnuncio(slug) : null;
  } catch (err) {
    // Sem o banco, entrega a página genérica; o navegador tenta carregar de novo
    console.error("Prévia do anúncio:", err.message);
    return new Response(html, { headers: { ...cabecalhos, "Cache-Control": "no-store" } });
  }

  if (!a) {
    html = html.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex">');
    return new Response(html, { status: 404, headers: { ...cabecalhos, "Cache-Control": "public, s-maxage=60" } });
  }

  const origem = `https://${request.headers.get("x-forwarded-host") || url.host}`;
  const m = metaAnuncio(a, origem);
  // Anúncios antigos sem imagem guardada: a Vercel desenha uma em /api/og
  const versao = createHash("sha1").update(JSON.stringify([a.nome, a.profissao, a.cidade, a.uf, a.logo_url])).digest("hex").slice(0, 10);
  const imagem = logoConfiavel(a.imagem_url) ? a.imagem_url : `${origem}/api/og?slug=${encodeURIComponent(a.slug)}&v=${versao}`;
  const { titulo, descricao, endereco } = m;

  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escaparHtml(titulo)} | VotoniKem</title>`);
  html = trocarMeta(html, "description", descricao);
  html = trocarMeta(html, "og:type", "profile");
  html = trocarMeta(html, "og:title", titulo);
  html = trocarMeta(html, "og:description", descricao);
  html = trocarMeta(html, "og:url", endereco);
  html = trocarMeta(html, "og:image", imagem);
  html = trocarMeta(html, "og:image:alt", m.imagemAlt);
  html = trocarMeta(html, "twitter:title", titulo);
  html = trocarMeta(html, "twitter:description", descricao);
  html = trocarMeta(html, "twitter:image", imagem);
  html = html.replace("</head>", () => `  <link rel="canonical" href="${escaparHtml(endereco)}">\n</head>`);

  return new Response(html, {
    headers: { ...cabecalhos, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" }
  });
}
