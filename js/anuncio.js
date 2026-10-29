// Página própria de um anúncio: /a/<slug> (ou anuncio.html?a=<slug>)
(() => {
  const $ = (id) => document.getElementById(id);

  const lerSlug = () => {
    const m = location.pathname.match(/\/a\/([^/?#]+)/);
    const s = m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get("a");
    return /^[a-z0-9-]{3,80}$/.test(s || "") ? s : "";
  };

  const definirMeta = (prop, valor) => {
    let el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(prop.startsWith("og:") ? "property" : "name", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", valor);
  };

  const mostrar = (id) => ["carregando", "nao-encontrado", "anuncio"].forEach((k) =>
    $(k).classList.toggle("hidden", k !== id));

  document.addEventListener("DOMContentLoaded", async () => {
    const VK = window.VK;
    const slug = lerSlug();
    if (!VK || !slug) return mostrar("nao-encontrado");

    let a;
    try {
      const p = new URLSearchParams({ select: VK.COLUNAS, slug: `eq.${slug}`, limit: "1" });
      const { itens } = await VK.consultar(p.toString());
      a = itens[0];
    } catch (err) {
      console.error("Erro ao carregar anúncio:", err);
      $("carregando").textContent = "Não foi possível carregar o anúncio agora. Atualize a página em instantes.";
      return;
    }
    if (!a) return mostrar("nao-encontrado");

    // Conteúdo
    const titulo = `${a.nome} · ${a.profissao} em ${a.cidade}/${a.uf} | VotoniKem`;
    document.title = titulo;
    const resumo = a.descricao ? a.descricao.slice(0, 155) : `${a.profissao} em ${a.cidade}/${a.uf}. Fale direto pelo WhatsApp.`;
    definirMeta("description", resumo);
    definirMeta("og:title", titulo);
    definirMeta("og:description", resumo);

    $("an-avatar").innerHTML = VK.avatar(a, "avatar avatar-grande");
    $("an-nome").textContent = a.nome;
    $("an-local").textContent = `${a.cidade} · ${a.uf}${a.tipo === "autonomo" ? " · Autônomo" : ""}`;
    $("an-selos").innerHTML = VK.selos(a);
    // Destaque: só o selo acima do nome e a borda dourada (sem a etiqueta do canto, que fica para os cards)
    if (a.destaque) {
      $("an-selo-destaque").classList.remove("hidden");
      $("an-card").classList.add("!border-amber-500/70");
    }
    if (a.descricao) {
      $("an-descricao").textContent = a.descricao;
      $("an-descricao").classList.remove("hidden");
    }
    if (a.whatsapp) {
      $("an-zap").href = VK.linkZap(a.whatsapp, a.nome);
      $("an-zap").textContent = `WhatsApp  ${VK.formatarZap(a.whatsapp)}`;
    } else {
      $("an-zap").classList.add("hidden"); // anunciante preferiu não mostrar o WhatsApp
    }
    const insta = VK.linkInstagram(a.instagram);
    if (insta) {
      $("an-insta").href = insta;
      $("an-insta").textContent = String(a.instagram).startsWith("@") ? a.instagram : "Instagram";
      $("an-insta").classList.remove("hidden");
    }
    const site = VK.linkSite(a.site);
    if (site) {
      $("an-site").href = site;
      $("an-site").textContent = site.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 40);
      $("an-site").classList.remove("hidden");
    }
    // Só Instagram ou só site: o botão ocupa a linha inteira
    if (!!insta !== !!site) (insta ? $("an-insta") : $("an-site")).classList.add("sm:col-span-2");
    if (a.status !== "verificado") $("an-aviso-verificacao").classList.remove("hidden");

    // Compartilhar e denunciar
    const url = `${location.origin}/a/${encodeURIComponent(a.slug)}`;
    $("compartilhar-zap").href = `https://wa.me/?text=${encodeURIComponent(`${a.nome} (${a.profissao}, ${a.cidade}/${a.uf}) no VotoniKem: ${url}`)}`;
    $("copiar-link").addEventListener("click", async () => {
      const botao = $("copiar-link");
      try { await navigator.clipboard.writeText(url); } catch {
        const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      botao.textContent = "Link copiado!";
      setTimeout(() => (botao.textContent = "Copiar link"), 2000);
    });
    const assunto = `Denúncia de anúncio: ${a.slug}`;
    const corpo = `Anúncio: ${url}\n\nMotivo (golpe, perfil falso, conteúdo ilegal, desrespeito ao Código de Conduta):\n\nDetalhes e, se possível, links ou prints:\n`;
    $("denunciar").href = `mailto:dpo@votonikem.com.br?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

    mostrar("anuncio");
  });
})();
