(() => {
  const CFG = window.VOTONIKEM_CONFIG || {};
  const SITE_URL = window.location.origin; // segue o domínio em uso
  const MIN_PARA_MOSTRAR_ESTATISTICAS = 20; // evita exibir números baixos no começo
  const VERSAO_CONSENTIMENTO = "2026-10-29-v3"; // aviso de novos profissionais na região + art. 11 (opinião política)

  const $ = (id) => document.getElementById(id);
  const supabaseConfigurado = () =>
    CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("SEU-PROJETO") &&
    CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes("SUA_CHAVE");

  const supabaseFetch = (path, body) =>
    fetch(`${CFG.SUPABASE_URL}/rest/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: CFG.SUPABASE_ANON_KEY,
        // Chaves "sb_publishable_" vão só no apikey; chaves antigas (JWT) também no Authorization
        ...(CFG.SUPABASE_ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}` } : {}),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body || {})
    });

  const copiar = async (texto, botao, rotuloOk = "Copiado!") => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback para navegadores sem permissão de clipboard
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (!botao.dataset.rotulo) botao.dataset.rotulo = botao.textContent; // evita perder o texto em cliques seguidos
    botao.textContent = rotuloOk;
    botao.classList.add("!bg-emerald-600", "!text-white");
    clearTimeout(botao._timer);
    botao._timer = setTimeout(() => {
      botao.textContent = botao.dataset.rotulo;
      botao.classList.remove("!bg-emerald-600", "!text-white");
    }, 2000);

    // Comemoração: confete saindo do botão e agradecimento
    const r = botao.getBoundingClientRect();
    if (window.soltarConfete) window.soltarConfete(r.left + r.width / 2, r.top + r.height / 2);
    if (window.mostrarAviso) window.mostrarAviso("Copiado! Agora é só colar no app do seu banco. Obrigado pelo apoio! 💚");
  };

  /* ---------------- PIX (BR Code / EMV) ---------------- */

  const semAcento = (s, max) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .\-@]/g, "")
      .toUpperCase().trim().slice(0, max);

  const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

  const crc16 = (str) => {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  };

  const gerarPix = (valor, descricao = CFG.PIX_DESCRICAO) => {
    const contaRecebedor =
      campo("00", "br.gov.bcb.pix") +
      campo("01", CFG.PIX_CHAVE) +
      (descricao ? campo("02", semAcento(descricao, 40)) : "");
    const payload =
      campo("00", "01") +
      campo("26", contaRecebedor) +
      campo("52", "0000") +
      campo("53", "986") +
      campo("54", valor.toFixed(2)) +
      campo("58", "BR") +
      campo("59", semAcento(CFG.PIX_RECEBEDOR, 25)) +
      campo("60", semAcento(CFG.PIX_CIDADE, 15)) +
      campo("62", campo("05", "***")) +
      "6304";
    return payload + crc16(payload);
  };
  window.__gerarPix = gerarPix; // usado nos testes e no Destaque (js/destaque.js)

  const PIX_MIN = 1;
  const PIX_MAX = 10000;
  let copiaECola = "";

  const mostrarPix = (valor, botaoAtivo) => {
    document.querySelectorAll(".pix-valor").forEach((b) =>
      b.classList.toggle("!border-amber-500", b === botaoAtivo));
    copiaECola = gerarPix(valor);
    $("pix-valor-texto").textContent =
      valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const qr = $("pix-qr");
    qr.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qr, { text: copiaECola, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
    }
    const box = $("pix-cobranca");
    box.classList.remove("hidden");
    if (window.innerWidth < 768) box.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  document.querySelectorAll(".pix-valor").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("pix-outro").value = "";
      $("pix-outro-erro").classList.add("hidden");
      mostrarPix(Number(btn.dataset.valor), btn);
    });
  });

  // Converte "1.234,56", "15,5", "20" ou "20.50" em número
  const lerValor = (texto) => {
    let t = texto.replace(/[^\d,.]/g, "");
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, "");
    const n = Math.round(parseFloat(t) * 100) / 100;
    return Number.isFinite(n) ? n : NaN;
  };

  const inputOutro = $("pix-outro");
  if (inputOutro) {
    inputOutro.addEventListener("input", () => {
      inputOutro.value = inputOutro.value.replace(/[^\d,.]/g, "").slice(0, 10);
    });
    $("pix-outro-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const erro = $("pix-outro-erro");
      const valor = lerValor(inputOutro.value);
      const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      if (!(valor >= PIX_MIN && valor <= PIX_MAX)) {
        erro.textContent = `Digite um valor entre ${brl(PIX_MIN)} e ${brl(PIX_MAX)}.`;
        erro.classList.remove("hidden");
        return;
      }
      erro.classList.add("hidden");
      inputOutro.value = valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      mostrarPix(valor, null);
    });
  }

  const btnCopiaECola = $("btn-copy-copiaecola");
  if (btnCopiaECola) btnCopiaECola.addEventListener("click", () => copiar(copiaECola, btnCopiaECola));

  const btnCopyPix = $("btn-copy-pix");
  if (btnCopyPix) btnCopyPix.addEventListener("click", () => copiar($("pix-key").dataset.copiar || $("pix-key").innerText.trim(), btnCopyPix));

  /* ---------------- Meta do servidor ---------------- */

  // Lê a meta do Supabase (tabela meta_arrecadacao); se falhar, usa os valores do config.js
  const metaBarra = $("meta-barra");
  if (metaBarra) {
    const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    let visivel = false, pctAtual = null;
    const pintar = () => {
      if (visivel && pctAtual !== null) requestAnimationFrame(() => (metaBarra.style.width = pctAtual + "%"));
    };
    const META_MIN_PCT = Number(CFG.META_MIN_PCT_EXIBIR ?? 15); // abaixo disso, mostra convite em vez do valor
    const mostrarMeta = (arrecadado, total, atualizadoEm) => {
      if (!(total > 0)) return;
      pctAtual = Math.min(100, (arrecadado / total) * 100);
      const inicio = pctAtual < META_MIN_PCT;
      metaBarra.parentElement.hidden = inicio;
      if (inicio) {
        $("meta-texto").textContent = "Seja um dos primeiros apoiadores 💚";
        const info = $("meta-info");
        if (info) info.textContent = "Cada apoio ajuda a manter o anúncio grátis para quem está começando.";
        return;
      }
      $("meta-texto").textContent = `${brl(arrecadado)} de ${brl(total)}`;
      const info = $("meta-info");
      if (info) {
        const partes = [];
        if (pctAtual >= 100) partes.push("Meta batida! Obrigado a todos os apoiadores 🎉");
        else if (arrecadado <= 0) partes.push("Seja o primeiro a apoiar 💚");
        else partes.push(`${Math.floor(pctAtual)}% da meta`);
        if (atualizadoEm) {
          const d = new Date(atualizadoEm);
          if (!isNaN(d)) partes.push(`atualizado em ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`);
        }
        info.textContent = partes.join(" · ");
      }
      pintar();
    };

    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) { visivel = true; pintar(); obs.disconnect(); }
      });
      obs.observe(metaBarra);
    } else visivel = true;

    const usarConfig = () => mostrarMeta(Number(CFG.META_ARRECADADO) || 0, Number(CFG.META_TOTAL) || 0);
    if (supabaseConfigurado()) {
      const chave = CFG.SUPABASE_ANON_KEY;
      fetch(`${CFG.SUPABASE_URL}/rest/v1/meta_arrecadacao?select=arrecadado,total,atualizado_em&limit=1`, {
        headers: { apikey: chave, ...(chave.startsWith("eyJ") ? { Authorization: `Bearer ${chave}` } : {}) }
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((linhas) => {
          const m = linhas && linhas[0];
          m ? mostrarMeta(Number(m.arrecadado), Number(m.total), m.atualizado_em) : usarConfig();
        })
        .catch(usarConfig);
    } else usarConfig();
  }

  /* ---------------- Máscara de WhatsApp (usada nos formulários) ---------------- */
  // O formulário de anúncio fica em js/anunciar.js

  function mascararZap(valor) {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    return v;
  }
  window.VKmascararZap = mascararZap;

  /* ---------------- Abas: Quero anunciar / Procuro profissionais ---------------- */

  const abas = { anunciar: $("aba-anunciar"), cliente: $("aba-cliente") };
  const paineis = { anunciar: $("painel-anunciar"), cliente: $("painel-cliente") };
  const trocarAba = (qual, focar = false) => {
    Object.keys(abas).forEach((k) => {
      if (!abas[k]) return;
      const ativo = k === qual;
      abas[k].setAttribute("aria-selected", String(ativo));
      abas[k].tabIndex = ativo ? 0 : -1;
      paineis[k].hidden = !ativo;
    });
    if (focar && abas[qual]) abas[qual].focus();
  };
  if (abas.anunciar && abas.cliente) {
    abas.anunciar.addEventListener("click", () => trocarAba("anunciar"));
    abas.cliente.addEventListener("click", () => trocarAba("cliente"));
    [abas.anunciar, abas.cliente].forEach((b) => b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") trocarAba(b === abas.anunciar ? "cliente" : "anunciar", true);
    }));
    // chegando de outra página com /#procuro: abre direto a aba do consumidor
    if (location.hash === "#procuro") {
      trocarAba("cliente");
      setTimeout(() => $("planos").scrollIntoView({ block: "start" }), 50);
    }
    // links com #procuro abrem direto a aba do consumidor
    document.querySelectorAll('a[href="#procuro"]').forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      trocarAba("cliente");
      $("planos").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  /* ---------------- Formulário do consumidor ---------------- */

  const formCli = $("cliente-form");
  const zapCli = $("cli-whatsapp");
  if (zapCli) zapCli.addEventListener("input", () => { zapCli.value = mascararZap(zapCli.value); });

  if (formCli) {
    const erroCli = (msg) => { const el = $("cli-erro"); el.textContent = msg; el.classList.toggle("hidden", !msg); };
    const sucessoCli = () => {
      formCli.classList.add("hidden");
      $("cli-sucesso").classList.remove("hidden");
      const texto = `Achei o VotoniKem: um diretório para encontrar profissionais de confiança perto de você. Dá uma olhada: ${SITE_URL}/diretorio`;
      $("cli-compartilhar").href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    };
    formCli.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroCli("");
      if (formCli.confirmar_email.value) return sucessoCli(); // robô
      const cidade = formCli.cidade.value.trim();
      const procura = formCli.procura.value.trim();
      const dados = {
        whatsapp: formCli.whatsapp.value.replace(/\D/g, ""),
        uf: formCli.uf.value,
        ...(cidade.length >= 2 ? { cidade } : {}),
        ...(procura ? { procura: procura.slice(0, 120) } : {}),
        consentimento: formCli.consentimento.checked,
        consentimento_versao: VERSAO_CONSENTIMENTO,
        origem: (document.referrer || "direto").slice(0, 200)
      };
      if (!/^\d{10,11}$/.test(dados.whatsapp)) return erroCli("Informe um WhatsApp válido com DDD.");
      if (!dados.uf) return erroCli("Selecione o seu estado.");
      if (!dados.consentimento) return erroCli("Marque a autorização para podermos te avisar.");
      if (!supabaseConfigurado()) return erroCli("O cadastro está em configuração. Tente novamente em instantes.");
      const botao = $("cli-enviar");
      botao.disabled = true;
      $("cli-enviar-texto").textContent = "Enviando...";
      try {
        const resp = await supabaseFetch("clientes_interessados", dados);
        if (resp.ok || resp.status === 409) return sucessoCli();
        throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        console.error("Erro ao enviar cadastro de cliente:", err);
        erroCli("Não foi possível enviar agora. Verifique sua conexão e tente de novo.");
      } finally {
        botao.disabled = false;
        $("cli-enviar-texto").textContent = "Quero ser avisado";
      }
    });
  }

  /* ---------------- Prova social ---------------- */

  if (supabaseConfigurado()) {
    supabaseFetch("rpc/estatisticas_fila")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s || s.total < MIN_PARA_MOSTRAR_ESTATISTICAS) return;
        $("stat-total").textContent = s.total.toLocaleString("pt-BR");
        $("stat-estados").textContent = s.estados;
        if ($("stat-cidades")) $("stat-cidades").textContent = (s.cidades ?? "").toLocaleString("pt-BR");
        const box = $("estatisticas");
        box.classList.remove("hidden");
        box.classList.add("flex");
      })
      .catch(() => {});
  }

  /* ---------------- Benefícios surgem ao rolar ---------------- */

  const cardsBeneficio = document.querySelectorAll(".beneficio");
  if (cardsBeneficio.length && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-animar");
    const obsBeneficio = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = [...cardsBeneficio].indexOf(e.target);
        setTimeout(() => e.target.classList.add("visivel"), i * 90);
        obsBeneficio.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    cardsBeneficio.forEach((c) => obsBeneficio.observe(c));
  }

  /* ---------------- Política e Termos em janela ---------------- */

  const modal = $("modal-legal");
  const cacheLegal = {};

  const carregarLegal = async (url) => {
    if (cacheLegal[url]) return cacheLegal[url];
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const doc = new DOMParser().parseFromString(await resp.text(), "text/html");
    const titulo = doc.getElementById("titulo-legal");
    const conteudo = doc.getElementById("conteudo-legal");
    if (!titulo || !conteudo) throw new Error("conteúdo não encontrado");
    return (cacheLegal[url] = { titulo: titulo.textContent.trim(), html: conteudo.innerHTML });
  };

  const fecharModal = () => {
    if (modal.open) modal.close();
  };

  if (modal && typeof modal.showModal === "function") {
    modal.addEventListener("close", () => document.body.classList.remove("modal-aberto"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-fechar-modal]")) fecharModal();
    });

    document.addEventListener("click", async (e) => {
      const link = e.target.closest('a[href$="politica-de-privacidade.html"], a[href$="termos-de-uso.html"], a[href$="codigo-de-conduta.html"]');
      if (!link || link.id === "modal-legal-link" || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      const url = link.getAttribute("href");
      const corpo = $("modal-legal-corpo");
      $("modal-legal-titulo").textContent = "Carregando...";
      corpo.innerHTML = "";
      $("modal-legal-link").href = url;
      document.body.classList.add("modal-aberto");
      if (!modal.open) modal.showModal();
      try {
        const { titulo, html } = await carregarLegal(url);
        $("modal-legal-titulo").textContent = titulo;
        corpo.innerHTML = html;
        corpo.scrollTop = 0;
      } catch (err) {
        console.error("Erro ao abrir documento:", err);
        window.location.href = url; // sem conexão: abre a página normal
      }
    });
  }

  /* ---------------- WhatsApp do projeto ---------------- */

  const zapContato = String(CFG.WHATSAPP_CONTATO || "").replace(/\D/g, "");
  if (/^\d{12,13}$/.test(zapContato)) {
    const link = `https://wa.me/${zapContato}?text=${encodeURIComponent("Olá! Vim pelo site do VotoniKem e tenho uma dúvida.")}`;
    ["whatsapp-flutuante", "rodape-whatsapp", "quem-whatsapp"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.href = link;
      el.hidden = false;
      el.classList.remove("hidden");
      if (id === "quem-whatsapp") el.classList.add("inline-flex");
    });
  }

  /* ---------------- Banner de cookies (LGPD) ---------------- */

  const cookieBanner = $("cookie-banner");
  const acceptCookiesBtn = $("accept-cookies");
  let aceito = null;
  try { aceito = localStorage.getItem("votonikem_cookies_accepted"); } catch {}

  if (!aceito && cookieBanner) {
    setTimeout(() => cookieBanner.classList.remove("translate-y-full", "opacity-0"), 1000);
  }
  if (acceptCookiesBtn) {
    acceptCookiesBtn.addEventListener("click", () => {
      try { localStorage.setItem("votonikem_cookies_accepted", "true"); } catch {}
      cookieBanner.classList.add("translate-y-full", "opacity-0");
    });
  }
})();
