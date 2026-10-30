// Cloudflare Pages: /sitemap.xml com as páginas fixas e todos os anúncios publicados
import { gerarSitemap } from "../lib/anuncio.js";

export async function onRequestGet({ env, request }) {
  // Modo manutenção: só a página inicial
  const manutencao = (await env.ASSETS.fetch(new URL("/manutencao.txt", request.url))).ok;
  const xml = manutencao
    ? '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://votonikem.com.br/</loc></url>\n</urlset>'
    : await gerarSitemap(env.SUPABASE_URL_TESTE);
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
  });
}
