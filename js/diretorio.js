// Página do diretório: busca por palavra, estado, cidade e profissão, com "carregar mais".
(() => {
  const POR_PAGINA = 24;
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", () => {
    const VK = window.VK;
    const form = $("busca");
    if (!VK || !form) return;

    let pagina = 0, total = 0, carregados = 0, pedido = 0;

    // Limpa caracteres que têm significado na sintaxe de filtros da API
    const limpar = (t) => String(t || "").replace(/[(),*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

    const lerFiltros = () => ({
      q: limpar($("f-q").value),
      uf: /^[A-Z]{2}$/.test($("f-uf").value) ? $("f-uf").value : "",
      cidade: limpar($("f-cidade").value),
      profissao: limpar($("f-profissao").value)
    });

    const montarParams = (f, offset) => {
      const p = new URLSearchParams();
      p.set("select", VK.COLUNAS);
      if (f.uf) p.set("uf", `eq.${f.uf}`);
      if (f.cidade) p.set("cidade", `ilike.*${f.cidade}*`);
      if (f.profissao) p.set("profissao", `ilike.*${f.profissao}*`);
      if (f.q) p.set("or", `(nome.ilike.*${f.q}*,profissao.ilike.*${f.q}*,descricao.ilike.*${f.q}*,cidade.ilike.*${f.q}*)`);
      // Destaque primeiro, depois verificados, depois os mais recentes
      p.set("order", "destaque.desc,status.desc,criado_em.desc");
      p.set("limit", String(POR_PAGINA));
      p.set("offset", String(offset));
      return p.toString();
    };

    const descreverFiltros = (f) => {
      const partes = [];
      if (f.q) partes.push(`“${f.q}”`);
      if (f.profissao) partes.push(f.profissao);
      if (f.cidade) partes.push(`em ${f.cidade}`);
      if (f.uf) partes.push(f.cidade ? `/${f.uf}` : `em ${f.uf}`);
      return partes.join(" ").replace(" /", "/");
    };

    const atualizarUrl = (f) => {
      const p = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
      const nova = `${location.pathname}${p.toString() ? "?" + p : ""}`;
      history.replaceState(null, "", nova);
    };

    const carregar = async (acumular = false) => {
      const f = lerFiltros();
      const meu = ++pedido;
      if (!acumular) { pagina = 0; carregados = 0; }
      $("erro").classList.add("hidden");
      $("mais").classList.add("hidden");
      if (!acumular) {
        $("resultados").setAttribute("aria-busy", "true");
        $("resumo").textContent = "Buscando...";
      }
      try {
        const { itens, total: t } = await VK.consultar(montarParams(f, pagina * POR_PAGINA));
        if (meu !== pedido) return; // chegou uma busca mais nova
        total = t ?? itens.length;
        const html = itens.map((a) => VK.cardAnuncio(a)).join("");
        if (acumular) $("resultados").insertAdjacentHTML("beforeend", html);
        else $("resultados").innerHTML = html;
        carregados += itens.length;
        pagina++;

        const temFiltro = Object.values(f).some(Boolean);
        $("vazio").classList.toggle("hidden", carregados > 0);
        $("limpar").classList.toggle("hidden", !temFiltro);
        const desc = descreverFiltros(f);
        $("resumo").textContent = carregados === 0
          ? (temFiltro ? `Nenhum anúncio encontrado ${desc ? "para " + desc : ""}.` : "Nenhum anúncio publicado ainda.")
          : `${total.toLocaleString("pt-BR")} ${total === 1 ? "anúncio" : "anúncios"}${desc ? " · " + desc : ""}`;
        $("mais").classList.toggle("hidden", carregados >= total);
      } catch (err) {
        console.error("Erro ao buscar anúncios:", err);
        if (meu !== pedido) return;
        $("resumo").textContent = "";
        $("erro").classList.remove("hidden");
      } finally {
        $("resultados").removeAttribute("aria-busy");
      }
    };

    // Sugestões de cidades do estado escolhido
    const carregarCidades = async (uf) => {
      const lista = $("lista-cidades");
      lista.innerHTML = "";
      if (!uf) return;
      try {
        const p = new URLSearchParams({ select: "cidade", uf: `eq.${uf}`, limit: "1000" });
        const { itens } = await VK.consultar(p.toString());
        const cidades = [...new Set(itens.map((i) => i.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR"));
        lista.innerHTML = cidades.map((c) => `<option value="${VK.escapar(c)}">`).join("");
      } catch (e) { /* sugestões são opcionais */ }
    };

    // Filtros vindos do endereço (?uf=SP&q=bolo), para links compartilháveis
    const inicial = new URLSearchParams(location.search);
    $("f-q").value = inicial.get("q") || "";
    $("f-uf").value = (inicial.get("uf") || "").toUpperCase();
    $("f-cidade").value = inicial.get("cidade") || "";
    $("f-profissao").value = inicial.get("profissao") || "";
    if ($("f-uf").value) carregarCidades($("f-uf").value);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      atualizarUrl(lerFiltros());
      carregar();
    });
    $("f-uf").addEventListener("change", () => {
      carregarCidades($("f-uf").value);
      atualizarUrl(lerFiltros());
      carregar();
    });
    $("limpar").addEventListener("click", () => {
      form.reset();
      $("lista-cidades").innerHTML = "";
      atualizarUrl(lerFiltros());
      carregar();
    });
    $("mais").addEventListener("click", () => carregar(true));

    carregar();
  });
})();
