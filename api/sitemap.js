// Vercel: /sitemap.xml (a versão da Cloudflare fica em functions/sitemap.xml.js)
import { gerarSitemap } from "../lib/anuncio.js";

export async function GET() {
  return new Response(await gerarSitemap(), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" }
  });
}
