(() => {
  const CFG = window.VOTONIKEM_CONFIG || {};
  const SITE_URL = "https://votonikem.com.br";
  const MIN_PARA_MOSTRAR_ESTATISTICAS = 20; // evita exibir números baixos no começo

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
    const original = botao.textContent;
    botao.textContent = rotuloOk;
    botao.classList.add("!bg-emerald-600", "!text-white");
    setTimeout(() => {
      botao.textContent = original;
      botao.classList.remove("!bg-emerald-600", "!text-white");
    }, 2000);
  };

  /* ---------------- PIX (BR Code / EMV) ---------------- */

  const semAcento = (s, max) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-@]/g, "")
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

  const gerarPix = (valor) => {
    const contaRecebedor =
      campo("00", "br.gov.bcb.pix") +
      campo("01", CFG.PIX_CHAVE) +
      (CFG.PIX_DESCRICAO ? campo("02", semAcento(CFG.PIX_DESCRICAO, 40)) : "");
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
  window.__gerarPix = gerarPix; // usado nos testes

  let copiaECola = "";
  document.querySelectorAll(".pix-valor").forEach((btn) => {
    btn.addEventListener("click", () => {
      const valor = Number(btn.dataset.valor);
      document.querySelectorAll(".pix-valor").forEach((b) =>
        b.classList.toggle("!border-amber-500", b === btn));
      copiaECola = gerarPix(valor);
      $("pix-valor-texto").textContent =
        valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const qr = $("pix-qr");
      qr.innerHTML = "";
      if (window.QRCode) {
        new QRCode(qr, { text: copiaECola, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
      }
      $("pix-cobranca").classList.remove("hidden");
    });
  });

  const btnCopiaECola = $("btn-copy-copiaecola");
  if (btnCopiaECola) btnCopiaECola.addEventListener("click", () => copiar(copiaECola, btnCopiaECola));

  const btnCopyPix = $("btn-copy-pix");
  if (btnCopyPix) btnCopyPix.addEventListener("click", () => copiar($("pix-key").innerText.trim(), btnCopyPix));

  /* ---------------- Meta do servidor ---------------- */

  const metaBarra = $("meta-barra");
  if (metaBarra && CFG.META_TOTAL) {
    const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    $("meta-texto").textContent = `${brl(CFG.META_ARRECADADO)} de ${brl(CFG.META_TOTAL)}`;
    const pct = Math.min(100, (CFG.META_ARRECADADO / CFG.META_TOTAL) * 100);
    const animar = () => requestAnimationFrame(() => (metaBarra.style.width = pct + "%"));
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) { animar(); obs.disconnect(); }
      });
      obs.observe(metaBarra);
    } else animar();
  }

  /* ---------------- Formulário da Lista VIP ---------------- */

  const form = $("lead-form");
  const inputZap = $("lead-whatsapp");

  if (inputZap) {
    inputZap.addEventListener("input", () => {
      const d = inputZap.value.replace(/\D/g, "").slice(0, 11);
      let v = d;
      if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      inputZap.value = v;
    });
  }

  const mostrarErro = (msg) => {
    const el = $("lead-erro");
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
  };

  const mostrarSucesso = (jaCadastrado) => {
    form.classList.add("hidden");
    const box = $("lead-sucesso");
    if (jaCadastrado) box.querySelector("h4").textContent = "Você já está na fila!";
    box.classList.remove("hidden");
    const texto = `Conheça o VotoniKem, o diretório de negócios da direita no Brasil. Entrei na lista VIP de lançamento: ${SITE_URL}`;
    $("btn-compartilhar").href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      mostrarErro("");

      if (form.site.value) return mostrarSucesso(false); // robô

      const dados = {
        nome: form.nome.value.trim(),
        whatsapp: form.whatsapp.value.replace(/\D/g, ""),
        uf: form.uf.value,
        cidade: form.cidade.value.trim(),
        rede_social: form.rede_social.value.trim(),
        consentimento: form.consentimento.checked,
        origem: (document.referrer || "direto").slice(0, 200)
      };

      if (dados.nome.length < 3) return mostrarErro("Informe seu nome ou a razão social.");
      if (!/^\d{10,11}$/.test(dados.whatsapp)) return mostrarErro("Informe um WhatsApp válido com DDD.");
      if (!dados.uf) return mostrarErro("Selecione o seu estado.");
      if (dados.cidade.length < 2) return mostrarErro("Informe a sua cidade.");
      if (dados.rede_social.length < 2) return mostrarErro("Informe seu Instagram ou rede social.");
      if (!dados.consentimento) return mostrarErro("Marque a autorização para podermos te avisar.");

      if (!supabaseConfigurado()) {
        return mostrarErro("O cadastro está em configuração. Tente novamente em instantes.");
      }

      const botao = $("lead-enviar");
      botao.disabled = true;
      $("lead-enviar-texto").textContent = "Enviando...";

      try {
        const resp = await supabaseFetch("leads", dados);
        if (resp.ok) return mostrarSucesso(false);
        if (resp.status === 409) return mostrarSucesso(true);
        throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        console.error("Erro ao enviar cadastro:", err);
        mostrarErro("Não foi possível enviar agora. Verifique sua conexão e tente de novo.");
      } finally {
        botao.disabled = false;
        $("lead-enviar-texto").textContent = "Entrar para a Lista VIP de Lançamento";
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
        const box = $("estatisticas");
        box.classList.remove("hidden");
        box.classList.add("flex");
      })
      .catch(() => {});
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
      const link = e.target.closest('a[href$="politica-de-privacidade.html"], a[href$="termos-de-uso.html"]');
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
