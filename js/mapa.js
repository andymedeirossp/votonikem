// Mapa do Brasil em 3D: estados com anúncios publicados acendem em verde e amarelo.
(() => {
  const DADOS = window.MAPA_BRASIL;
  const CFG = window.VOTONIKEM_CONFIG || {};
  const MIN_PARA_NUMEROS = 20; // abaixo disso, não mostramos quantidades
  const MIN_ESTADOS_PAINEL = 5; // abaixo disso, o painel de estados/regiões fica escondido
  const CAMADAS_RELEVO = 7;
  const NS = "http://www.w3.org/2000/svg";

  const REGIOES = {
    Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
    Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
    "Centro-Oeste": ["DF", "GO", "MT", "MS"],
    Sudeste: ["ES", "MG", "RJ", "SP"],
    Sul: ["PR", "RS", "SC"]
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };
  const reduzirMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const buscarContagem = async () => {
    const ok = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("SEU-PROJETO");
    if (!ok) return [];
    const chave = CFG.SUPABASE_ANON_KEY;
    const resp = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/contagem_por_uf`, {
      method: "POST",
      headers: {
        apikey: chave,
        ...(chave.startsWith("eyJ") ? { Authorization: `Bearer ${chave}` } : {}),
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    return resp.ok ? resp.json() : [];
  };

  const montar = (cena) => {
    const palco = $("mapa-3d");
    // Camadas de relevo (de baixo para cima), dão a espessura do mapa
    for (let i = CAMADAS_RELEVO; i >= 1; i--) {
      const svg = el("svg", { viewBox: DADOS.viewBox, class: "mapa-camada mapa-relevo", "aria-hidden": "true" });
      svg.style.transform = `translateZ(${-i * 3.5}px)`;
      svg.style.setProperty("--tom", (1 - i * 0.08).toFixed(2));
      DADOS.estados.forEach((e) => svg.appendChild(el("path", { d: e.d })));
      palco.appendChild(svg);
    }

    // Camada de cima, interativa
    const topo = el("svg", { viewBox: DADOS.viewBox, class: "mapa-camada mapa-topo", role: "img",
      "aria-label": "Mapa do Brasil com os estados que já têm anúncios no diretório" });
    const defs = el("defs");
    defs.innerHTML = `
      <linearGradient id="mapa-grad-ativo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#facc15"/><stop offset="1" stop-color="#16a34a"/>
      </linearGradient>
      <filter id="mapa-brilho" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    topo.appendChild(defs);
    const grupoEstados = el("g", { class: "mapa-estados" });
    const grupoPulsos = el("g", { class: "mapa-pulsos", "aria-hidden": "true" });
    DADOS.estados.forEach((e, i) => {
      const p = el("path", { d: e.d, class: "mapa-estado", "data-uf": e.uf, tabindex: "0", role: "link",
        "aria-label": `${e.nome}: ver anúncios` });
      p.style.setProperty("--atraso", `${i * 35}ms`);
      grupoEstados.appendChild(p);
    });
    topo.appendChild(grupoEstados);
    topo.appendChild(grupoPulsos);
    palco.appendChild(topo);
    return { topo, grupoPulsos };
  };

  const aplicarDados = ({ topo, grupoPulsos }, lista) => {
    const porUf = Object.fromEntries(lista.map((x) => [x.uf, x.total]));
    const total = lista.reduce((s, x) => s + x.total, 0);
    const mostrarNumeros = total >= MIN_PARA_NUMEROS;
    const ativos = Object.keys(porUf);

    topo.querySelectorAll(".mapa-estado").forEach((p) => {
      const uf = p.dataset.uf;
      if (!porUf[uf]) return;
      p.classList.add("ativo");
      const b = p.getBBox();
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      const g = el("g", { transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)})` });
      g.appendChild(el("circle", { r: "9", class: "mapa-pulso" }));
      g.appendChild(el("circle", { r: "3.5", class: "mapa-ponto" }));
      grupoPulsos.appendChild(g);
    });

    // Painel lateral: no começo da rede, mostra um convite em vez de números baixos
    const poucos = ativos.length < MIN_ESTADOS_PAINEL;
    $("mapa-numeros").hidden = poucos;
    $("mapa-teaser").classList.toggle("hidden", !poucos);
    // Painel lateral
    $("mapa-estados-ativos").textContent = ativos.length;
    const regioesAtivas = Object.entries(REGIOES).filter(([, ufs]) => ufs.some((u) => porUf[u]));
    $("mapa-regioes-ativas").textContent = regioesAtivas.length;
    const lista_ = $("mapa-lista-regioes");
    lista_.innerHTML = "";
    Object.entries(REGIOES).forEach(([nome, ufs]) => {
      const n = ufs.filter((u) => porUf[u]).length;
      const li = document.createElement("li");
      li.className = "mapa-regiao" + (n ? " ativa" : "");
      li.innerHTML = `<span>${nome}</span><span class="mapa-regiao-barra"><span style="width:${(n / ufs.length) * 100}%"></span></span><span class="mapa-regiao-n">${n}/${ufs.length}</span>`;
      lista_.appendChild(li);
    });

    // Dica ao passar o mouse ou tocar
    const tip = $("mapa-tooltip");
    const cena = $("mapa-cena");
    const nomePorUf = Object.fromEntries(DADOS.estados.map((e) => [e.uf, e.nome]));
    const mostrar = (p, x, y) => {
      const uf = p.dataset.uf, n = porUf[uf];
      let msg;
      const toque = p.dataset.toque === "1";
      if (n && mostrarNumeros) msg = `${n.toLocaleString("pt-BR")} ${n === 1 ? "anúncio" : "anúncios"} · ${toque ? "toque de novo para ver" : "clique para ver"}`;
      else if (n) msg = toque ? "Já tem anúncios aqui · toque de novo para ver" : "Já tem anúncios aqui · clique para ver";
      else msg = "Seja o primeiro do seu estado: anuncie grátis";
      tip.innerHTML = `<strong>${nomePorUf[uf]}</strong><span>${msg}</span>`;
      tip.classList.toggle("ativo-tip", !!n);
      const r = cena.getBoundingClientRect();
      tip.style.left = `${Math.min(Math.max(x - r.left, 70), r.width - 70)}px`;
      tip.style.top = `${Math.max(y - r.top - 14, 10)}px`;
      tip.classList.add("visivel");
    };
    let timerToque = null;
    const esconder = () => tip.classList.remove("visivel");
    topo.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const p = e.target.closest(".mapa-estado");
      p ? mostrar(p, e.clientX, e.clientY) : esconder();
    });
    topo.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") esconder(); });
    // Clique (ou Enter) num estado: abre o diretório filtrado; estado sem anúncios leva ao cadastro
    const abrirEstado = (p) => {
      const uf = p.dataset.uf;
      location.href = porUf[uf] ? `/diretorio?uf=${uf}` : "#planos";
    };
    // No celular: o 1º toque mostra a dica; o 2º toque no mesmo estado abre
    let ultimoToque = null;
    let tipoPonteiro = "mouse"; // Safari antigo não informa pointerType no "click"; guardamos o do pointerdown
    topo.addEventListener("pointerdown", (e) => { tipoPonteiro = e.pointerType || "mouse"; }, true);
    topo.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      const p = e.target.closest(".mapa-estado");
      if (!p) { ultimoToque = null; return esconder(); }
      if (ultimoToque === p) { esconder(); return abrirEstado(p); }
      ultimoToque = p;
      p.dataset.toque = "1";
      mostrar(p, e.clientX, e.clientY);
      clearTimeout(timerToque);
      timerToque = setTimeout(() => { esconder(); ultimoToque = null; }, 3200);
    });
    topo.addEventListener("click", (e) => {
      if (tipoPonteiro === "touch" || e.pointerType === "touch") return;
      const p = e.target.closest(".mapa-estado");
      if (p) abrirEstado(p);
    });
    topo.addEventListener("keydown", (e) => {
      const p = e.target.closest(".mapa-estado");
      if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirEstado(p); }
    });
    topo.addEventListener("focusin", (e) => {
      const p = e.target.closest(".mapa-estado");
      if (!p) return;
      const b = p.getBoundingClientRect();
      mostrar(p, b.left + b.width / 2, b.top + b.height / 2);
    });
    topo.addEventListener("focusout", esconder);
  };

  const ativarInclinacao = () => {
    const cena = $("mapa-cena"), palco = $("mapa-3d");
    if (reduzirMovimento()) return;
    let alvoX = 0, alvoY = 0, atualX = 0, atualY = 0, rodando = false;
    const passo = () => {
      atualX += (alvoX - atualX) * 0.08;
      atualY += (alvoY - atualY) * 0.08;
      palco.style.setProperty("--incl-x", `${atualX.toFixed(2)}deg`);
      palco.style.setProperty("--incl-y", `${atualY.toFixed(2)}deg`);
      if (Math.abs(alvoX - atualX) > 0.01 || Math.abs(alvoY - atualY) > 0.01) requestAnimationFrame(passo);
      else rodando = false;
    };
    const mover = (nx, ny) => {
      alvoX = -ny * 8; alvoY = nx * 10;
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    };
    cena.addEventListener("pointermove", (e) => {
      const r = cena.getBoundingClientRect();
      mover((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    });
    cena.addEventListener("pointerleave", () => mover(0, 0));
  };

  document.addEventListener("DOMContentLoaded", () => {
    const cena = $("mapa-cena");
    if (!cena || !DADOS) return;
    const partes = montar(cena);
    ativarInclinacao();

    const iniciar = () => {
      cena.classList.add("visivel");
      buscarContagem().then((lista) => aplicarDados(partes, lista)).catch(() => aplicarDados(partes, []));
    };
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((ent) => {
        if (ent.some((e) => e.isIntersecting)) { iniciar(); obs.disconnect(); }
      }, { threshold: 0.25 });
      obs.observe(cena);
    } else iniciar();
  });
})();
