// Página do profissional: /t/<slug> (ou talento.html?t=<slug>)
(() => {
  const $ = (id) => document.getElementById(id);
  const lerSlug = () => {
    const m = location.pathname.match(/\/t\/([^/?#]+)/);
    const s = m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get("t");
    return /^[a-z0-9-]{3,80}$/.test(s || "") ? s : "";
  };
  const mostrar = (id) => ["carregando", "nao-encontrado", "perfil"].forEach((k) => $(k).classList.toggle("hidden", k !== id));

  document.addEventListener("DOMContentLoaded", async () => {
    const VK = window.VK, T = window.VKT;
    const slug = lerSlug();
    if (!VK || !T || !slug) return mostrar("nao-encontrado");

    let t;
    try {
      const { itens } = await T.consultar(new URLSearchParams({ select: T.COLUNAS, slug: `eq.${slug}`, limit: "1" }).toString());
      t = itens[0];
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      $("carregando").textContent = "Não foi possível carregar o perfil agora. Atualize a página em instantes.";
      return;
    }
    if (!t) return mostrar("nao-encontrado");

    document.title = `${t.nome} · ${t.cargo} | VotoniKem`;
    $("p-avatar").innerHTML = T.avatar(t, "avatar avatar-grande");
    $("p-nome").textContent = t.nome;
    $("p-cargo").textContent = t.cargo;
    const disp = (t.disponibilidade || []).map((d) => T.DISPONIBILIDADE[d] || d).join(", ");
    $("p-local").textContent = `${t.cidade} · ${t.uf}${disp ? ` · ${disp}` : ""}`;

    if (t.resumo) { $("p-sobre").textContent = t.resumo; $("p-sobre-sec").classList.remove("hidden"); }
    const hab = String(t.habilidades || "").split(",").map((h) => h.trim()).filter(Boolean);
    if (hab.length) {
      $("p-hab").innerHTML = hab.map((h) => `<span>${VK.escapar(h)}</span>`).join("");
      $("p-hab-sec").classList.remove("hidden");
    }
    const exp = String(t.experiencias || "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (exp.length) {
      $("p-exp").innerHTML = exp.map((l) => `<li class="bg-[#0d1424] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200">${VK.escapar(l)}</li>`).join("");
      $("p-exp-sec").classList.remove("hidden");
    }

    const acoes = [];
    const pdf = T.linkPdf(t.pdf_url);
    if (pdf) acoes.push(`<button type="button" data-pdf="${VK.escapar(pdf)}" class="btn-pdf w-full !py-3.5 !text-base">📄 Ver currículo completo (PDF)</button>`);
    const zap = T.linkZap(t.whatsapp, t.nome);
    if (zap) acoes.push(`<a href="${VK.escapar(zap)}" target="_blank" rel="noopener nofollow" class="btn-zap !py-3.5 !text-base">Chamar no WhatsApp</a>`);
    const mail = T.linkEmail(t.email, t.nome);
    if (mail) acoes.push(`<a href="${VK.escapar(mail)}" class="btn-link btn-email !py-3.5 !text-base">Enviar e-mail</a>`);
    $("p-acoes").innerHTML = acoes.join("");
    if (acoes.length === 1) $("p-acoes").classList.remove("sm:grid-cols-2");

    const ate = new Date(t.expira_em);
    $("p-validade").textContent = `⏳ Perfil ativo até ${ate.toLocaleDateString("pt-BR")}`;
    const url = `${location.origin}/t/${encodeURIComponent(t.slug)}`;
    const corpo = `Perfil: ${url}\n\nMotivo (golpe, perfil falso, dados de outra pessoa, conteúdo ilegal):\n\nDetalhes:\n`;
    $("p-denunciar").href = `mailto:dpo@votonikem.com.br?subject=${encodeURIComponent("Denúncia de perfil: " + t.slug)}&body=${encodeURIComponent(corpo)}`;

    mostrar("perfil");
  });
})();
