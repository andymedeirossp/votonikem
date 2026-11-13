// Listas de negócios por cidade: mostra as listas aprovadas e recebe novas listas dos organizadores.
(() => {
  const VERSAO_CONSENTIMENTO = "2026-11-11-lista-v1";
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", () => {
    const VK = window.VK, CFG = window.VOTONIKEM_CONFIG || {};
    if (!VK) return;
    const e = (t) => VK.escapar(t);
    const cabecalhos = (extra = {}) => ({ apikey: CFG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`, ...extra });

    // Só abre links https (o banco também exige)
    const linkSeguro = (u) => (/^https:\/\/\S{4,}$/.test(String(u || "")) ? String(u) : "");
    const ondeFica = (u) => {
      try {
        const h = new URL(u).hostname.replace(/^www\./, "");
        if (/instagram\.com$/.test(h)) return "Instagram";
        if (/chat\.whatsapp\.com$|wa\.me$/.test(h)) return "Grupo de WhatsApp";
        if (/docs\.google\.com$/.test(h)) return "Planilha / documento";
        if (/t\.me$|telegram\./.test(h)) return "Telegram";
        if (/facebook\.com$/.test(h)) return "Facebook";
        return h;
      } catch { return ""; }
    };

    const card = (l) => {
      const link = linkSeguro(l.link);
      return `<article class="bg-[#162032] border border-slate-800 rounded-2xl p-5 flex flex-col">
        <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">📍 ${e(l.cidade)} · ${e(l.uf)}</p>
        <h3 class="text-base font-extrabold text-white mb-1">${e(l.nome)}</h3>
        <p class="text-xs text-slate-400 mb-3">Organizada por <strong class="text-slate-200">${e(l.organizador)}</strong></p>
        ${l.descricao ? `<p class="text-xs text-slate-400 leading-relaxed mb-4 flex-1">${e(l.descricao)}</p>` : `<div class="flex-1"></div>`}
        ${link ? `<a href="${e(link)}" target="_blank" rel="noopener nofollow ugc" class="btn-link btn-site !py-2.5 text-center">Abrir a lista ↗ <span class="text-slate-400 font-normal">(${e(ondeFica(link))})</span></a>` : ""}
        <a href="/anunciar" class="text-[11px] text-amber-400 hover:underline text-center mt-3">Está nessa lista? Anuncie grátis no VotoniKem</a>
      </article>`;
    };

    /* ---------------- listas aprovadas ---------------- */
    let pedido = 0;
    const carregar = async () => {
      const meu = ++pedido;
      const uf = $("f-uf").value;
      const p = new URLSearchParams({ select: "id,nome,uf,cidade,link,descricao,organizador,criado_em", order: "uf.asc,cidade.asc,criado_em.desc", limit: "500" });
      if (/^[A-Z]{2}$/.test(uf)) p.set("uf", `eq.${uf}`);
      $("erro").classList.add("hidden");
      $("resumo").textContent = "Carregando listas...";
      try {
        const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/listas_publicas?${p}`, { headers: cabecalhos() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const itens = await r.json();
        if (meu !== pedido) return;
        $("resultados").innerHTML = itens.map(card).join("");
        $("vazio").classList.toggle("hidden", itens.length > 0);
        const cidades = new Set(itens.map((l) => `${l.cidade}/${l.uf}`.toLowerCase())).size;
        $("resumo").textContent = itens.length
          ? `${itens.length} ${itens.length === 1 ? "lista" : "listas"} em ${cidades} ${cidades === 1 ? "cidade" : "cidades"}`
          : (uf ? "Nenhuma lista neste estado ainda." : "");
      } catch (err) {
        console.error("Erro ao carregar listas:", err);
        if (meu !== pedido) return;
        $("resumo").textContent = "";
        $("erro").classList.remove("hidden");
      }
    };
    $("f-uf").addEventListener("change", carregar);
    carregar();

    /* ---------------- envio pelo organizador ---------------- */
    const form = $("lista-form");
    const erro = (msg) => {
      $("l-erro").textContent = msg;
      $("l-erro").classList.toggle("hidden", !msg);
      if (msg) $("l-erro").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const normalizarLink = (v) => {
      let s = String(v || "").trim().replace(/\s+/g, "");
      if (!s) return "";
      if (/^http:\/\//i.test(s)) s = s.replace(/^http:/i, "https:");
      if (!/^https:\/\//i.test(s)) s = "https://" + s;
      return /^https:\/\/[^\s/.]+\.[^\s]{2,}/i.test(s) ? s.slice(0, 300) : "";
    };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      erro("");
      if ($("l-confirmar").value) return; // robô
      const dados = {
        nome: $("l-nome").value.trim().replace(/\s+/g, " ").slice(0, 80),
        uf: $("l-uf").value,
        cidade: $("l-cidade").value.trim().replace(/\s+/g, " ").slice(0, 80),
        link: normalizarLink($("l-link").value),
        descricao: $("l-descricao").value.trim().slice(0, 240),
        organizador: $("l-organizador").value.trim().replace(/\s+/g, " ").slice(0, 60),
        contato: $("l-contato").value.trim().slice(0, 120),
        consentimento: $("l-consentimento").checked,
        consentimento_versao: VERSAO_CONSENTIMENTO
      };
      if (dados.nome.length < 3) return erro("Informe o nome da lista.");
      if (!dados.uf) return erro("Selecione o estado.");
      if (dados.cidade.length < 2) return erro("Informe a cidade.");
      if (!dados.link) return erro("Informe um link válido para a lista (site, Instagram, planilha ou grupo).");
      if (dados.organizador.length < 2) return erro("Informe quem organiza a lista.");
      const zap = dados.contato.replace(/\D/g, "");
      const ehEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.contato);
      if (!ehEmail && !/^\d{10,13}$/.test(zap)) return erro("Informe um WhatsApp com DDD ou um e-mail para confirmarmos a lista.");
      if (!dados.consentimento) return erro("Marque a autorização para divulgarmos a lista.");

      const botao = $("l-enviar");
      botao.disabled = true;
      $("l-enviar-texto").textContent = "Enviando...";
      try {
        const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/enviar_lista`, {
          method: "POST", headers: cabecalhos({ "Content-Type": "application/json" }), body: JSON.stringify({ p: dados })
        });
        if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
        form.classList.add("hidden");
        const convite = `Nossa lista "${dados.nome}" vai aparecer no VotoniKem! Quem quiser, também pode criar a página do seu negócio lá, de graça, com contato direto pelo WhatsApp: ${location.origin}/`;
        $("l-compartilhar").href = `https://wa.me/?text=${encodeURIComponent(convite)}`;
        $("l-sucesso").classList.remove("hidden");
        $("l-sucesso").scrollIntoView({ behavior: "smooth", block: "center" });
        if (window.soltarConfete) { const b = $("l-sucesso").getBoundingClientRect(); window.soltarConfete(b.left + b.width / 2, b.top + 40, 90); }
      } catch (err) {
        console.error("Erro ao enviar lista:", err);
        erro("Não foi possível enviar agora. Verifique sua conexão e tente de novo.");
      } finally {
        botao.disabled = false;
        $("l-enviar-texto").textContent = "Enviar a lista";
      }
    });
  });
})();
