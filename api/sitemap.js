// /sitemap.xml → lista as páginas fixas e todos os anúncios publicados, para o Google encontrar.
import { SUPABASE_URL, SUPABASE_KEY, SITE } from "./_lib/anuncio.js";

const FIXAS = ["/", "/diretorio", "/politica-de-privacidade", "/termos-de-uso", "/codigo-de-conduta"];

export async function GET() {
  let anuncios = [];
  try {
    const p = new URLSearchParams({ select: "slug,criado_em", order: "criado_em.desc", limit: "10000" });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_publicos?${p}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(5000)
    });
    if (r.ok) anuncios = await r.json();
  } catch (err) {
    console.error("Sitemap:", err.message);
  }

  const url = (loc, data) => `  <url><loc>${SITE}${loc}</loc>${data ? `<lastmod>${String(data).slice(0, 10)}</lastmod>` : ""}</url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...FIXAS.map((p) => url(p)),
    ...anuncios.filter((a) => /^[a-z0-9-]{3,80}$/.test(a.slug)).map((a) => url(`/a/${a.slug}`, a.criado_em)),
    "</urlset>"
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" }
  });
}
