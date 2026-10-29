// Kit de divulgação grátis: gera logo, post e cartão digital no próprio navegador.
// Nenhum dado sai do aparelho da pessoa para gerar as imagens.
(() => {
  const PALETAS = {
    brasil:  { nome: "Verde",   grad: ["#16a34a", "#065f46"], acento: "#facc15" },
    azul:    { nome: "Azul",    grad: ["#3b82f6", "#1e3a8a"], acento: "#93c5fd" },
    rosa:    { nome: "Rosa",    grad: ["#f472b6", "#be185d"], acento: "#fbcfe8" },
    laranja: { nome: "Laranja", grad: ["#fb923c", "#c2410c"], acento: "#fed7aa" },
    roxo:    { nome: "Roxo",    grad: ["#a78bfa", "#5b21b6"], acento: "#ddd6fe" }
  };
  const FONTE = "Inter, 'Helvetica Neue', Arial, sans-serif";
  const NAVY = "#0f172a";
  const SITE = "votonikem.com.br";

  /* ---------- utilitários ---------- */

  const PALAVRAS_MENORES = new Set(["da", "de", "do", "das", "dos", "e", "&", "-", "me", "ltda", "eireli"]);
  const iniciais = (nome) => {
    const partes = nome.trim().split(/\s+/).filter((p) => !PALAVRAS_MENORES.has(p.toLowerCase()));
    const letras = (partes.length ? partes : nome.trim().split(/\s+/)).slice(0, 2).map((p) => p[0]);
    return letras.join("").toUpperCase() || "VK";
  };

  const formatarZap = (d) => {
    d = String(d || "").replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
  };

  const instagram = (rede) => {
    const r = String(rede || "").trim();
    if (!r) return "";
    const m = r.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    if (m) return "@" + m[1];
    return r.startsWith("@") ? r : "";
  };

  const dominio = (url) => String(url || "").trim()
    .replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "kit";

  const criarCanvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return [c, c.getContext("2d")];
  };

  const retArredondado = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Quebra o texto em até maxLinhas, diminuindo a fonte até caber
  const ajustarTexto = (ctx, texto, larguraMax, tamanho, minimo, maxLinhas, peso = 900) => {
    for (let t = tamanho; t >= minimo; t -= 2) {
      ctx.font = `${peso} ${t}px ${FONTE}`;
      const palavras = texto.split(/\s+/);
      const linhas = [];
      let atual = "";
      for (const p of palavras) {
        const teste = atual ? `${atual} ${p}` : p;
        if (ctx.measureText(teste).width <= larguraMax) atual = teste;
        else { if (atual) linhas.push(atual); atual = p; }
      }
      if (atual) linhas.push(atual);
      const cabe = linhas.length <= maxLinhas && linhas.every((l) => ctx.measureText(l).width <= larguraMax);
      if (cabe || t - 2 < minimo) {
        if (linhas.length > maxLinhas) {
          linhas.length = maxLinhas;
          let ult = linhas[maxLinhas - 1];
          while (ctx.measureText(ult + "…").width > larguraMax && ult.length > 1) ult = ult.slice(0, -1);
          linhas[maxLinhas - 1] = ult + "…";
        }
        return { linhas, tamanho: t };
      }
    }
  };

  const escreverLinhas = (ctx, { linhas, tamanho }, x, yTopo, cor, alturaLinha = 1.12) => {
    ctx.fillStyle = cor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    linhas.forEach((l, i) => ctx.fillText(l, x, yTopo + i * tamanho * alturaLinha));
    return yTopo + linhas.length * tamanho * alturaLinha;
  };

  const emblema = (ctx, cx, cy, r, paleta, texto) => {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, paleta.grad[0]);
    g.addColorStop(1, paleta.grad[1]);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = r * 0.25;
    ctx.shadowOffsetY = r * 0.08;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = r * 0.03; ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${r * (texto.length > 1 ? 0.82 : 1)}px ${FONTE}`;
    ctx.fillText(texto, cx, cy + r * 0.04);
  };

  const fundoEscuro = (ctx, w, h, paleta) => {
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.9);
    rg.addColorStop(0, paleta.grad[0] + "40"); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    const rg2 = ctx.createRadialGradient(0, h, 0, 0, h, w * 0.8);
    rg2.addColorStop(0, "rgba(16,185,129,0.14)"); rg2.addColorStop(1, "transparent");
    ctx.fillStyle = rg2; ctx.fillRect(0, 0, w, h);
    // faixa verde e amarela na base
    ctx.fillStyle = "#009C3B"; ctx.fillRect(0, h - 16, w / 2, 16);
    ctx.fillStyle = "#FFDF00"; ctx.fillRect(w / 2, h - 16, w / 2, 16);
  };

  const selo = (ctx, cx, y, texto, corBorda, corTexto, tamanho) => {
    ctx.font = `800 ${tamanho}px ${FONTE}`;
    const w = ctx.measureText(texto).width + tamanho * 1.6;
    const h = tamanho * 2.1;
    retArredondado(ctx, cx - w / 2, y, w, h, h / 2);
    ctx.fillStyle = "rgba(2,6,23,0.7)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = corBorda; ctx.stroke();
    ctx.fillStyle = corTexto; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(texto, cx, y + h / 2 + 1);
    return y + h;
  };

  const botaoZap = (ctx, cx, y, numero, tamanho) => {
    ctx.font = `800 ${tamanho}px ${FONTE}`;
    const rotulo = `WhatsApp  ${numero}`;
    const w = ctx.measureText(rotulo).width + tamanho * 2.4;
    const h = tamanho * 2.3;
    retArredondado(ctx, cx - w / 2, y, w, h, h / 2);
    ctx.fillStyle = "#25D366"; ctx.fill();
    ctx.fillStyle = "#052e16"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(rotulo, cx, y + h / 2 + 1);
    return y + h;
  };

  const rodapeMarca = (ctx, w, y, tamanho) => {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = `700 ${tamanho}px ${FONTE}`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Comunidade de negócios de Norte a Sul", w / 2, y);
    ctx.font = `900 ${tamanho * 1.15}px ${FONTE}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(SITE, w / 2, y + tamanho * 1.6);
  };

  /* ---------- as três peças ---------- */

  const desenharLogo = (d, p) => {
    const [c, ctx] = criarCanvas(1000, 1000);
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, 1000, 1000);
    emblema(ctx, 500, 340, 220, p, iniciais(d.nome));
    const nome = ajustarTexto(ctx, d.nome, 880, 92, 44, 3, 900);
    const fim = escreverLinhas(ctx, nome, 500, 605, NAVY, 1.06);
    ctx.letterSpacing = "3px";
    const prof = ajustarTexto(ctx, d.profissao.toUpperCase(), 860, 38, 22, 2, 800);
    escreverLinhas(ctx, prof, 500, fim + 20, p.grad[1], 1.25);
    ctx.letterSpacing = "0px";
    return c;
  };

  const desenharPost = (d, p) => {
    const W = 1080, H = 1080;
    const [c, ctx] = criarCanvas(W, H);
    fundoEscuro(ctx, W, H, p);
    selo(ctx, W / 2, 70, "FAÇO PARTE DO VOTONIKEM", "rgba(245,158,11,0.75)", "#fbbf24", 30);
    emblema(ctx, W / 2, 330, 125, p, iniciais(d.nome));
    const nome = ajustarTexto(ctx, d.nome, 940, 84, 46, 2, 900);
    let y = escreverLinhas(ctx, nome, W / 2, 495, "#ffffff", 1.08);
    const prof = ajustarTexto(ctx, d.profissao, 900, 44, 28, 1, 800);
    y = escreverLinhas(ctx, prof, W / 2, y + 18, p.acento);
    ctx.font = `700 34px ${FONTE}`; ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(`${d.cidade} · ${d.uf}`, W / 2, y + 18);
    botaoZap(ctx, W / 2, 815, formatarZap(d.whatsapp), 34);
    rodapeMarca(ctx, W, 985, 26);
    return c;
  };

  const desenharCartao = (d, p) => {
    const W = 1080, H = 1920;
    const [c, ctx] = criarCanvas(W, H);
    fundoEscuro(ctx, W, H, p);
    selo(ctx, W / 2, 150, "FAÇO PARTE DO VOTONIKEM", "rgba(245,158,11,0.75)", "#fbbf24", 34);
    emblema(ctx, W / 2, 560, 200, p, iniciais(d.nome));
    const nome = ajustarTexto(ctx, d.nome, 940, 104, 52, 3, 900);
    let y = escreverLinhas(ctx, nome, W / 2, 820, "#ffffff", 1.08);
    const prof = ajustarTexto(ctx, d.profissao, 920, 54, 30, 2, 800);
    y = escreverLinhas(ctx, prof, W / 2, y + 26, p.acento);
    ctx.font = `700 42px ${FONTE}`; ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(`${d.cidade} · ${d.uf}`, W / 2, y + 26);
    ctx.font = `700 34px ${FONTE}`; ctx.fillStyle = "#94a3b8";
    ctx.fillText("Chame no WhatsApp", W / 2, 1360);
    let yLinks = botaoZap(ctx, W / 2, 1420, formatarZap(d.whatsapp), 44) + 36;
    ctx.font = `800 38px ${FONTE}`; ctx.fillStyle = "#e2e8f0"; ctx.textBaseline = "top";
    const insta = instagram(d.rede_social);
    if (insta) { ctx.fillText(`Instagram ${insta}`, W / 2, yLinks); yLinks += 56; }
    const site = dominio(d.site);
    if (site) ctx.fillText(ajustarTexto(ctx, site, 900, 38, 26, 1, 800).linhas[0], W / 2, yLinks);
    rodapeMarca(ctx, W, 1800, 30);
    return c;
  };

  const PECAS = {
    logo:   { rotulo: "Logo",            arquivo: "logo",   desenhar: desenharLogo },
    post:   { rotulo: "Post Instagram",  arquivo: "post",   desenhar: desenharPost },
    cartao: { rotulo: "Cartão / Status", arquivo: "cartao", desenhar: desenharCartao }
  };

  const carregarFontes = () => Promise.all(
    ["700", "800", "900"].map((w) => document.fonts ? document.fonts.load(`${w} 40px Inter`) : null)
  ).catch(() => {});

  /* ---------- janela ---------- */

  const $ = (id) => document.getElementById(id);
  let dados = null;
  let paletaAtual = "brasil";
  let pecaAtual = "post";
  const canvases = {};

  const nomeArquivo = (peca) => `votonikem-${PECAS[peca].arquivo}-${slug(dados.nome)}.png`;

  const paraBlob = (canvas) => new Promise((ok) => canvas.toBlob(ok, "image/png"));

  const renderizar = async () => {
    await carregarFontes();
    const p = PALETAS[paletaAtual];
    for (const k of Object.keys(PECAS)) canvases[k] = PECAS[k].desenhar(dados, p);
    mostrarPeca();
  };

  const mostrarPeca = () => {
    const img = $("kit-preview");
    img.src = canvases[pecaAtual].toDataURL("image/png");
    img.alt = `${PECAS[pecaAtual].rotulo} gerado para ${dados.nome}`;
    img.className = `kit-preview kit-preview-${pecaAtual}`;
    document.querySelectorAll("[data-kit-peca]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.kitPeca === pecaAtual)));
  };

  const baixar = async (peca) => {
    const blob = await paraBlob(canvases[peca]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nomeArquivo(peca);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const compartilhar = async () => {
    const blob = await paraBlob(canvases[pecaAtual]);
    const arquivo = new File([blob], nomeArquivo(pecaAtual), { type: "image/png" });
    try {
      await navigator.share({ files: [arquivo], text: `Agora faço parte do VotoniKem! ${location.origin}` });
    } catch (e) { /* pessoa cancelou */ }
  };

  const abrir = async (d) => {
    dados = d;
    const modal = $("modal-kit");
    if (!modal || typeof modal.showModal !== "function") return;
    document.body.classList.add("modal-aberto");
    modal.showModal();
    await renderizar();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const modal = $("modal-kit");
    if (!modal) return;

    // Monta os botões de cor
    const cores = $("kit-cores");
    Object.entries(PALETAS).forEach(([id, p]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kit-cor";
      b.dataset.kitCor = id;
      b.title = p.nome;
      b.setAttribute("aria-label", `Cor ${p.nome}`);
      b.setAttribute("aria-pressed", String(id === paletaAtual));
      b.style.background = `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`;
      cores.appendChild(b);
    });

    if (navigator.canShare && navigator.canShare({ files: [new File([""], "t.png", { type: "image/png" })] })) {
      $("kit-compartilhar").classList.remove("hidden");
    }

    modal.addEventListener("close", () => document.body.classList.remove("modal-aberto"));
    modal.addEventListener("click", async (e) => {
      if (e.target === modal || e.target.closest("[data-fechar-kit]")) return modal.close();
      const cor = e.target.closest("[data-kit-cor]");
      if (cor) {
        paletaAtual = cor.dataset.kitCor;
        document.querySelectorAll("[data-kit-cor]").forEach((b) =>
          b.setAttribute("aria-pressed", String(b === cor)));
        return renderizar();
      }
      const peca = e.target.closest("[data-kit-peca]");
      if (peca) { pecaAtual = peca.dataset.kitPeca; return mostrarPeca(); }
      if (e.target.closest("#kit-baixar")) return baixar(pecaAtual);
      if (e.target.closest("#kit-baixar-tudo")) {
        for (const k of Object.keys(PECAS)) { await baixar(k); await new Promise((r) => setTimeout(r, 400)); }
        return;
      }
      if (e.target.closest("#kit-compartilhar")) return compartilhar();
    });
  });

  window.VotoniKit = { abrir, PALETAS, PECAS, desenhar: (d, cor = "brasil") =>
    Object.fromEntries(Object.entries(PECAS).map(([k, v]) => [k, v.desenhar(d, PALETAS[cor])])) };
})();
