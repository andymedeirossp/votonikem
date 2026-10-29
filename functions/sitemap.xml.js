// Cloudflare Pages: /sitemap.xml com as páginas fixas e todos os anúncios publicados
import { gerarSitemap } from "../lib/anuncio.js";

export async function onRequestGet({ env }) {
  return new Response(await gerarSitemap(env.SUPABASE_URL_TESTE), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
  });
}
