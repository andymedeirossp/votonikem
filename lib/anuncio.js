// Código comum das funções do servidor (Cloudflare Pages Functions e, até a migração, Vercel).
// Usa a mesma chave pública que o site usa no navegador: só lê o que já é público.
export const SUPABASE_URL = "https://jmvdgwtvyubwmhfyqras.supabase.co";
export const SUPABASE_KEY = "sb_publishable_kWlOHA3mmh4vetrifiDUcg_6HeTk9_B";

// Endereço oficial do site (sitemap)
export const SITE = "https://votonikem.com.br";

export const COLUNAS = "slug,tipo,nome,profissao,descricao,uf,cidade,logo_url,imagem_url,status,destaque";

export const slugValido = (s) => /^[a-z0-9-]{3,80}$/.test(s || "");

const PREFIXO_STORAGE = `${SUPABASE_URL}/storage/v1/object/public/logos/`;
// Só aceita imagens guardadas no Storage do próprio projeto
export const logoConfiavel = (url) => typeof url === "string" && url.startsWith(PREFIXO_STORAGE);

const consultar = async (params, base = SUPABASE_URL) => {
  const r = await fetch(`${base}/rest/v1/anuncios_publicos?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(4000)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
};

// base: permite apontar para um servidor de teste
export async function buscarAnuncio(slug, base) {
  if (!slugValido(slug)) return null;
  const itens = await consultar(new URLSearchParams({ select: COLUNAS, slug: `eq.${slug}`, limit: "1" }), base);
  return itens[0] || null;
}

export const escaparHtml = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const resumir = (t, max) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
};

// Textos da prévia do link de um anúncio
export function metaAnuncio(a, origem) {
  const local = `${a.cidade}/${a.uf}`;
  const titulo = `${a.nome} · ${a.profissao} em ${local}`;
  return {
    titulo,
    descricao: a.descricao ? resumir(a.descricao, 155) : `${a.profissao} em ${local}. Fale direto pelo WhatsApp no diretório VotoniKem.`,
    endereco: `${origem}/a/${a.slug}`,
    imagem: logoConfiavel(a.imagem_url) ? a.imagem_url : `${origem}/img/og-image.jpg`,
    imagemAlt: `${a.nome}, ${a.profissao} em ${local}, no VotoniKem`
  };
}

const PAGINAS_FIXAS = ["/", "/diretorio", "/politica-de-privacidade", "/termos-de-uso", "/codigo-de-conduta"];

export async function gerarSitemap(base) {
  let anuncios = [];
  try {
    anuncios = await consultar(new URLSearchParams({ select: "slug,criado_em", order: "criado_em.desc", limit: "10000" }), base);
  } catch (err) {
    console.error("Sitemap:", err.message);
  }
  const url = (loc, data) => `  <url><loc>${SITE}${loc}</loc>${data ? `<lastmod>${String(data).slice(0, 10)}</lastmod>` : ""}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PAGINAS_FIXAS.map((p) => url(p)),
    ...anuncios.filter((a) => slugValido(a.slug)).map((a) => url(`/a/${a.slug}`, a.criado_em)),
    "</urlset>"
  ].join("\n");
}
