// Banco de talentos: busca (cargo, estado, cidade, tipo de vaga) e cadastro com currículo em PDF.
(() => {
  const POR_PAGINA = 24;
  const VERSAO_CONSENTIMENTO = "2026-11-01-talento-v1";
  const PDF_MAX = 2 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", () => {
    const VK = window.VK, T = window.VKT, CFG = window.VOTONIKEM_CONFIG || {};
    if (!VK || !T) return;

    /* ---------------- busca ---------------- */
    let pagina = 0, total = 0, carregados = 0, pedido = 0, disp = "";
    const limpar = (t) => String(t || "").replace(/[(),*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    const filtros = () => ({
      q: limpar($("f-q").value),
      uf: /^[A-Z]{2}$/.test($("f-uf").value) ? $("f-uf").value : "",
      cidade: limpar($("f-cidade").value),
      disp: T.DISPONIBILIDADE[disp] ? disp : ""
    });
    const params = (f, offset) => {
      const p = new URLSearchParams();
      p.set("select", T.COLUNAS);
      if (f.uf) p.set("uf", `eq.${f.uf}`);
      if (f.cidade) p.set("cidade", `ilike.*${f.cidade}*`);
      if (f.disp) p.set("disponibilidade", `cs.{${f.disp}}`);
      if (f.q) p.set("or", `(cargo.ilike.*${f.q}*,resumo.ilike.*${f.q}*,habilidades.ilike.*${f.q}*,experiencias.ilike.*${f.q}*)`);
      p.set("order", "criado_em.desc");
      p.set("limit", String(POR_PAGINA));
      p.set("offset", String(offset));
      return p.toString();
    };
    const atualizarUrl = (f) => {
      const p = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
      history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p : ""}${location.hash}`);
    };
    const marcarChips = () => document.querySelectorAll("[data-disp]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.disp === disp)));

    const carregar = async (acumular = false) => {
      const f = filtros();
      const meu = ++pedido;
      if (!acumular) { pagina = 0; carregados = 0; $("resumo").textContent = "Buscando..."; }
      $("erro").classList.add("hidden");
      $("mais").classList.add("hidden");
      try {
        const { itens, total: t } = await T.consultar(params(f, pagina * POR_PAGINA));
        if (meu !== pedido) return;
        total = t ?? itens.length;
        const html = itens.map(T.cardTalento).join("");
        if (acumular) $("resultados").insertAdjacentHTML("beforeend", html); else $("resultados").innerHTML = html;
        carregados += itens.length;
        pagina++;
        const temFiltro = Object.values(f).some(Boolean);
        $("vazio").classList.toggle("hidden", carregados > 0);
        $("limpar").classList.toggle("hidden", !temFiltro);
        $("resumo").textContent = carregados === 0
          ? (temFiltro ? "Nenhum profissional encontrado com esses filtros." : "")
          : `${total.toLocaleString("pt-BR")} ${total === 1 ? "profissional disponível" : "profissionais disponíveis"}`;
        $("mais").classList.toggle("hidden", carregados >= total);
      } catch (err) {
        console.error("Erro ao buscar talentos:", err);
        if (meu !== pedido) return;
        $("resumo").textContent = "";
        $("erro").classList.remove("hidden");
      }
    };

    const inicial = new URLSearchParams(location.search);
    $("f-q").value = inicial.get("q") || "";
    $("f-uf").value = (inicial.get("uf") || "").toUpperCase();
    $("f-cidade").value = inicial.get("cidade") || "";
    disp = inicial.get("disp") || "";
    marcarChips();

    $("busca").addEventListener("submit", (e) => { e.preventDefault(); atualizarUrl(filtros()); carregar(); });
    $("f-uf").addEventListener("change", () => { atualizarUrl(filtros()); carregar(); });
    document.querySelectorAll("[data-disp]").forEach((b) => b.addEventListener("click", () => {
      disp = b.dataset.disp; marcarChips(); atualizarUrl(filtros()); carregar();
    }));
    $("limpar").addEventListener("click", () => { $("busca").reset(); disp = ""; marcarChips(); atualizarUrl(filtros()); carregar(); });
    $("mais").addEventListener("click", () => carregar(true));
    carregar();

    /* ---------------- cadastro ---------------- */
    const form = $("talento-form");
    const erro = (msg) => {
      $("t-erro").textContent = msg;
      $("t-erro").classList.toggle("hidden", !msg);
      if (msg) $("t-erro").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const zapInput = $("t-whatsapp");
    const mascara = (v) => {
      const d = v.replace(/\D/g, "").slice(0, 11);
      if (d.length <= 2) return d ? `(${d}` : "";
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };
    zapInput.addEventListener("input", () => { zapInput.value = mascara(zapInput.value); });
    $("t-resumo").addEventListener("input", () => { $("t-resumo-cont").textContent = $("t-resumo").value.length; });

    let pdf = null;
    $("t-pdf").addEventListener("change", async (e) => {
      pdf = null; erro("");
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const cabeca = new Uint8Array(await f.slice(0, 5).arrayBuffer());
      const ehPdf = String.fromCharCode(...cabeca) === "%PDF-";
      if (!ehPdf) { e.target.value = ""; return erro("O arquivo precisa ser um PDF."); }
      if (f.size > PDF_MAX) { e.target.value = ""; return erro("O PDF tem mais de 2 MB. Salve uma versão menor e tente de novo."); }
      pdf = f;
    });

    const enviarPdf = async () => {
      if (!pdf) return null;
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
      const caminho = `pdf/${id}.pdf`;
      const r = await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/curriculos/${caminho}`, {
        method: "POST", headers: T.cabecalhos({ "Content-Type": "application/pdf", "x-upsert": "false" }), body: pdf
      });
      if (!r.ok) throw new Error(`pdf HTTP ${r.status}`);
      return `${CFG.SUPABASE_URL}/storage/v1/object/public/curriculos/${caminho}`;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro("");
      if ($("t-confirmar").value) return; // robô
      const zap = zapInput.value.replace(/\D/g, "");
      const dados = {
        nome_completo: $("t-nome").value.trim().replace(/\s+/g, " ").slice(0, 80),
        cargo: $("t-cargo").value.trim().slice(0, 60),
        resumo: $("t-resumo").value.trim().slice(0, 400),
        habilidades: $("t-habilidades").value.split(",").map((h) => h.trim()).filter(Boolean).slice(0, 15).join(", ").slice(0, 300),
        experiencias: $("t-experiencias").value.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5).join("\n").slice(0, 600),
        disponibilidade: [...document.querySelectorAll("#t-disp input:checked")].map((c) => c.value),
        uf: $("t-uf").value,
        cidade: $("t-cidade").value.trim().slice(0, 80),
        whatsapp: zap,
        email: $("t-email").value.trim().toLowerCase(),
        mostrar_email: $("t-mostrar-email").checked,
        consentimento: $("t-consentimento").checked,
        consentimento_versao: VERSAO_CONSENTIMENTO,
        origem: (document.referrer || "direto").slice(0, 200)
      };
      if (dados.nome_completo.split(" ").length < 2) return erro("Informe seu nome e sobrenome.");
      if (dados.cargo.length < 2) return erro("Informe o cargo ou a área que você procura.");
      if (!dados.disponibilidade.length) return erro("Marque pelo menos um tipo de trabalho (CLT, PJ, freelance...).");
      if (!dados.uf) return erro("Selecione o estado.");
      if (dados.cidade.length < 2) return erro("Informe a cidade.");
      if (zap && !/^\d{10,11}$/.test(zap)) return erro("O WhatsApp parece incompleto. Use DDD + número.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) return erro("Informe um e-mail válido.");
      if (!zap && !dados.mostrar_email) return erro("Informe um WhatsApp ou marque para mostrar o e-mail, para as empresas conseguirem falar com você.");
      if (!dados.consentimento) return erro("Marque a autorização para publicarmos o seu perfil.");

      const botao = $("t-enviar");
      botao.disabled = true;
      $("t-enviar-texto").textContent = "Publicando...";
      try {
        try { dados.pdf_url = await enviarPdf(); } catch (err) {
          console.error("Falha ao enviar PDF:", err);
          return erro("Não foi possível enviar o PDF. Tente de novo ou publique sem ele.");
        }
        const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/publicar_talento`, {
          method: "POST", headers: T.cabecalhos({ "Content-Type": "application/json" }), body: JSON.stringify({ p: dados })
        });
        if (r.status === 409) return erro("Já existe um perfil ativo com este e-mail. Para alterar, fale com a gente pelo WhatsApp do projeto ou pelo contato@votonikem.com.br.");
        if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
        const slug = await r.json();
        form.classList.add("hidden");
        const url = `${location.origin}${T.linkTalento(slug)}`;
        $("t-ver").href = T.linkTalento(slug);
        $("t-compartilhar").href = `https://wa.me/?text=${encodeURIComponent(`Estou disponível para trabalhar! Meu perfil no banco de talentos do VotoniKem: ${url}`)}`;
        $("t-sucesso").classList.remove("hidden");
        $("t-sucesso").scrollIntoView({ behavior: "smooth", block: "center" });
        if (window.soltarConfete) { const b = $("t-sucesso").getBoundingClientRect(); window.soltarConfete(b.left + b.width / 2, b.top + 40, 90); }
        carregar();
      } catch (err) {
        console.error("Erro ao publicar talento:", err);
        erro("Não foi possível publicar agora. Verifique sua conexão e tente de novo.");
      } finally {
        botao.disabled = false;
        $("t-enviar-texto").textContent = "Publicar meu perfil grátis";
      }
    });
  });
})();
