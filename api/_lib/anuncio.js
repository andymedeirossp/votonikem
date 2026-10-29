// Busca um anúncio público no Supabase (mesma visão e chave pública usadas pelo site).
export const SUPABASE_URL = "https://jmvdgwtvyubwmhfyqras.supabase.co";
export const SUPABASE_KEY = "sb_publishable_kWlOHA3mmh4vetrifiDUcg_6HeTk9_B";

// Endereço oficial do site (links canônicos e sitemap)
export const SITE = "https://votonikem.com.br";

export const COLUNAS = "slug,tipo,nome,profissao,descricao,uf,cidade,logo_url,status,destaque";

export const slugValido = (s) => /^[a-z0-9-]{3,80}$/.test(s || "");

export async function buscarAnuncio(slug) {
  if (!slugValido(slug)) return null;
  const p = new URLSearchParams({ select: COLUNAS, slug: `eq.${slug}`, limit: "1" });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_publicos?${p}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(4000)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const itens = await r.json();
  return itens[0] || null;
}

// Só aceita logos guardados no Storage do próprio projeto
export const logoConfiavel = (url) =>
  typeof url === "string" && url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/logos/`);

export const escaparHtml = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const resumir = (t, max) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
};
