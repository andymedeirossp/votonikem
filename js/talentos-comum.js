// Banco de talentos: funções usadas pela lista (talentos.js) e pela página do profissional (talento.js).
(() => {
  const CFG = window.VOTONIKEM_CONFIG || {};
  const VK = window.VK;
  const COLUNAS = "slug,nome,cargo,resumo,habilidades,experiencias,uf,cidade,disponibilidade,whatsapp,email,pdf_url,criado_em,expira_em";

  const DISPONIBILIDADE = {
    clt: "CLT", pj: "PJ", freelance: "Freelance", remoto: "Remoto", primeiro_emprego: "Primeiro emprego"
  };

  const cabecalhos = (extra = {}) => ({ apikey: CFG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`, ...extra });

  const consultar = async (params) => {
    const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/talentos_publicos?${params}`, { headers: cabecalhos({ Prefer: "count=exact" }) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const total = Number((r.headers.get("content-range") || "").split("/")[1]);
    return { itens: await r.json(), total: Number.isFinite(total) ? total : null };
  };

  const e = (t) => VK.escapar(t);
  const linkTalento = (slug) => `/t/${encodeURIComponent(slug)}`;
  const linkZap = (zap, nome) => {
    const n = String(zap || "").replace(/\D/g, "");
    if (!n) return "";
    const msg = `Olá, ${String(nome || "").split(" ")[0]}! Vi o seu perfil no banco de talentos do VotoniKem e gostaria de conversar sobre uma oportunidade.`;
    return `https://wa.me/55${n}?text=${encodeURIComponent(msg)}`;
  };
  const linkEmail = (email, nome) => email
    ? `mailto:${email}?subject=${encodeURIComponent("Oportunidade (VotoniKem)")}&body=${encodeURIComponent(`Olá, ${String(nome || "").split(" ")[0]}! Vi o seu perfil no banco de talentos do VotoniKem.`)}`
    : "";
  // O PDF fica num espaço privado: pedimos um link temporário na hora de abrir (só funciona com o perfil ativo)
  const PREFIXO_PDF = `${CFG.SUPABASE_URL}/storage/v1/object/public/curriculos/`;
  const linkPdf = (url) => (typeof url === "string" && url.startsWith(PREFIXO_PDF + "pdf/") ? url : "");
  const abrirPdf = async (url) => {
    const janela = window.open("", "_blank"); // abre já no clique, para o navegador não bloquear
    try {
      const caminho = url.slice(PREFIXO_PDF.length);
      const r = await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/sign/curriculos/${caminho}`, {
        method: "POST", headers: cabecalhos({ "Content-Type": "application/json" }), body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { signedURL } = await r.json();
      const destino = `${CFG.SUPABASE_URL}/storage/v1${signedURL}`;
      if (janela) janela.location.href = destino; else location.href = destino;
    } catch (err) {
      console.error("Erro ao abrir currículo:", err);
      if (janela) janela.close();
      alert("Não foi possível abrir o currículo agora. Tente de novo em instantes.");
    }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pdf]");
    if (!b) return;
    e.preventDefault();
    abrirPdf(b.dataset.pdf);
  });

  const etiquetas = (t) => [
    `<span class="tag-prof">${e(t.cargo)}</span>`,
    (t.disponibilidade || []).length
      ? `<span class="tag-disp">${e(t.disponibilidade.map((d) => DISPONIBILIDADE[d] || d).join(" · "))}</span>` : ""
  ].join("");

  const avatar = (t, classe = "avatar") =>
    `<div class="${classe}" style="background:${VK.gradiente(t.nome)}" aria-hidden="true">${e(VK.iniciais(t.nome))}</div>`;

  const cardTalento = (t) => {
    const zap = linkZap(t.whatsapp, t.nome);
    const mail = linkEmail(t.email, t.nome);
    const pdf = linkPdf(t.pdf_url);
    return `<article class="anuncio anuncio-real bg-[#162032] border border-slate-800 rounded-2xl p-5 flex flex-col text-left">
      <div class="flex items-center gap-3 mb-4">${avatar(t)}
        <div class="min-w-0"><h3 class="text-sm font-extrabold text-white truncate"><a href="${linkTalento(t.slug)}" class="anuncio-link">${e(t.nome)}</a></h3>
        <p class="text-[11px] text-slate-400">${e(t.cidade)} · ${e(t.uf)}</p></div></div>
      <div class="flex flex-wrap gap-1.5 mb-3">${etiquetas(t)}</div>
      ${t.resumo ? `<p class="text-xs text-slate-400 leading-relaxed mb-5 flex-1 line-clamp-3">${e(t.resumo)}</p>` : `<div class="flex-1"></div>`}
      <div class="space-y-2">
        ${pdf ? `<button type="button" data-pdf="${e(pdf)}" class="btn-pdf w-full" data-contato>📄 Ver currículo</button>` : `<a href="${linkTalento(t.slug)}" class="btn-pdf" data-contato>👤 Ver perfil</a>`}
        ${zap ? `<a href="${e(zap)}" target="_blank" rel="noopener nofollow" class="btn-zap" data-contato>WhatsApp</a>`
              : mail ? `<a href="${e(mail)}" class="btn-link btn-email" data-contato>E-mail</a>` : ""}
      </div>
    </article>`;
  };

  window.VKT = { COLUNAS, DISPONIBILIDADE, cabecalhos, consultar, linkTalento, linkZap, linkEmail, linkPdf, abrirPdf, etiquetas, avatar, cardTalento };
})();
