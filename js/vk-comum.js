// Funções compartilhadas: consulta ao diretório no Supabase e o card de anúncio.
(() => {
  const CFG = window.VOTONIKEM_CONFIG || {};
  const chave = () => CFG.SUPABASE_ANON_KEY || "";
  const configurado = () => !!(CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("SEU-PROJETO") &&
    chave() && !chave().includes("SUA_CHAVE"));
  const cabecalhos = (extra = {}) => ({
    apikey: chave(),
    ...(chave().startsWith("eyJ") ? { Authorization: `Bearer ${chave()}` } : {}),
    ...extra
  });

  const COLUNAS = "slug,tipo,nome,profissao,descricao,uf,cidade,whatsapp,instagram,site,logo_url,status,destaque,criado_em";
  const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "&"]);

  const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const iniciais = (nome) => {
    const partes = String(nome || "").trim().split(/\s+/).filter((p) => !MINUSCULAS.has(p.toLowerCase()) && /\w/.test(p));
    return (partes.length ? partes : [nome || "?"]).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  };

  const formatarZap = (d) => {
    d = String(d || "").replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
  };

  const linkZap = (numero, nome) => {
    const d = String(numero || "").replace(/\D/g, "");
    const texto = `Olá${nome ? ", " + nome : ""}! Encontrei seu anúncio no VotoniKem e gostaria de mais informações.`;
    return `https://wa.me/55${d}?text=${encodeURIComponent(texto)}`;
  };

  const linkInstagram = (v) => {
    const s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const h = s.replace(/^@/, "").match(/^[A-Za-z0-9._]{1,30}$/);
    return h ? `https://instagram.com/${h[0]}` : "";
  };

  const linkSite = (v) => (/^https?:\/\//i.test(String(v || "")) ? v : "");

  const linkAnuncio = (slug) => `/a/${encodeURIComponent(slug)}`;

  // Cores do avatar sem logo: estáveis para cada nome
  const GRADIENTES = [
    ["#34d399", "#15803d"], ["#38bdf8", "#1d4ed8"], ["#f472b6", "#e11d48"],
    ["#fbbf24", "#ea580c"], ["#a78bfa", "#6d28d9"], ["#2dd4bf", "#0f766e"]
  ];
  const gradiente = (texto) => {
    let h = 0;
    for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [a, b] = GRADIENTES[h % GRADIENTES.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  };

  const avatar = (a, classe = "avatar") => a.logo_url
    ? `<div class="${classe} avatar-logo" style="background-image:url('${escapar(a.logo_url)}')" role="img" aria-label="Logo de ${escapar(a.nome)}"></div>`
    : `<div class="${classe}" style="background:${gradiente(a.nome)}" aria-hidden="true">${escapar(iniciais(a.nome))}</div>`;

  const selos = (a) => [
    `<span class="tag-prof">${escapar(a.profissao)}</span>`,
    a.status === "verificado" ? `<span class="tag-ok">✓ Verificado</span>` : `<span class="tag-verificando">Em verificação</span>`
  ].join("");

  // Card do diretório. opcoes.link: o card leva à página do anúncio; opcoes.contatos: botões ativos
  const cardAnuncio = (a, opcoes = {}) => {
    const { link = true, contatos = true } = opcoes;
    const insta = linkInstagram(a.instagram);
    const site = linkSite(a.site);
    const botao = (href, classe, rotulo) => contatos && href
      ? `<a href="${escapar(href)}" target="_blank" rel="noopener nofollow" class="${classe}" data-contato>${rotulo}</a>`
      : `<span class="${classe}">${rotulo}</span>`;
    const extras = [
      a.instagram ? botao(insta, "btn-link btn-insta", "Instagram") : "",
      a.site ? botao(site, "btn-link btn-site", "Site") : ""
    ].join("");
    const titulo = link && a.slug
      ? `<a href="${linkAnuncio(a.slug)}" class="anuncio-link">${escapar(a.nome)}</a>`
      : escapar(a.nome);
    return `<article class="anuncio anuncio-real ${a.destaque ? "anuncio-destaque" : ""} bg-[#162032] border ${a.destaque ? "border-2 border-amber-500/70" : "border-slate-800"} rounded-2xl p-5 flex flex-col text-left">
      <div class="flex items-center gap-3 mb-4">${avatar(a)}
        <div class="min-w-0"><h3 class="text-sm font-extrabold text-white truncate">${titulo}</h3>
        <p class="text-[11px] text-slate-400">${escapar(a.cidade)} · ${escapar(a.uf)}</p></div></div>
      <div class="flex flex-wrap gap-1.5 mb-3">${selos(a)}</div>
      ${a.descricao ? `<p class="text-xs text-slate-400 leading-relaxed mb-5 flex-1 line-clamp-3">${escapar(a.descricao)}</p>` : `<div class="flex-1"></div>`}
      <div class="space-y-2">${botao(linkZap(a.whatsapp, a.nome), "btn-zap", "WhatsApp")}${extras ? `<div class="flex gap-2">${extras}</div>` : ""}</div>
    </article>`;
  };

  // Consulta à visão pública do diretório (PostgREST). Devolve { itens, total }.
  const consultar = async (params) => {
    if (!configurado()) throw new Error("Supabase não configurado");
    const url = `${CFG.SUPABASE_URL}/rest/v1/anuncios_publicos?${params}`;
    const r = await fetch(url, { headers: cabecalhos({ Prefer: "count=exact" }) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const faixa = r.headers.get("content-range") || "";
    const total = Number(faixa.split("/")[1]);
    return { itens: await r.json(), total: Number.isFinite(total) ? total : null };
  };

  window.VK = {
    CFG, COLUNAS, configurado, cabecalhos, consultar,
    escapar, iniciais, formatarZap, linkZap, linkInstagram, linkSite, linkAnuncio,
    avatar, selos, cardAnuncio, gradiente
  };
})();
