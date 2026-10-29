// Gera, no navegador, a imagem 1200×630 que aparece na prévia do link do anúncio
// (WhatsApp, Facebook, Instagram). Fica guardada no Storage junto com o logo, então o
// servidor não precisa desenhar nada. Uso: await VKPrevia.gerar(anuncio, logoBlobOuUrl) → Blob JPEG
(() => {
  const W = 1200, H = 630;
  const AZUL = "#0f172a", OURO = "#fbbf24", VERDE = "#16a34a", AZUL_BR = "#1e3a8a";
  const FONTE = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";

  const iniciais = (nome) => String(nome || "?").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/)
    .filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

  const retangulo = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Quebra o texto em até maxLinhas, diminuindo a fonte até caber
  const linhas = (ctx, texto, largura, tamanho, minimo, maxLinhas, peso) => {
    for (let t = tamanho; t >= minimo; t -= 2) {
      ctx.font = `${peso} ${t}px ${FONTE}`;
      const palavras = String(texto).split(/\s+/);
      const res = [];
      let atual = "";
      for (const p of palavras) {
        const teste = atual ? `${atual} ${p}` : p;
        if (ctx.measureText(teste).width <= largura) atual = teste;
        else { if (atual) res.push(atual); atual = p; }
      }
      if (atual) res.push(atual);
      if (res.length <= maxLinhas && res.every((l) => ctx.measureText(l).width <= largura)) return { res, t };
    }
    ctx.font = `${peso} ${minimo}px ${FONTE}`;
    let unica = String(texto);
    while (unica.length > 1 && ctx.measureText(unica + "…").width > largura) unica = unica.slice(0, -1);
    return { res: [unica.trimEnd() + "…"], t: minimo };
  };

  const carregarImagem = (fonte) => new Promise((ok) => {
    if (!fonte) return ok(null);
    const url = fonte instanceof Blob ? URL.createObjectURL(fonte) : fonte;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = url;
  });

  async function gerar(a, logo) {
    try { await Promise.all(["400", "600", "800"].map((p) => document.fonts.load(`${p} 40px Inter`))); } catch (e) { /* usa a fonte do sistema */ }
    const imgLogo = await carregarImagem(logo);

    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    // Fundo
    ctx.fillStyle = AZUL; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 560);
    g.addColorStop(0, "rgba(22,163,74,0.28)"); g.addColorStop(1, "rgba(22,163,74,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W * 0.1, H, 0, W * 0.1, H, 700);
    g.addColorStop(0, "rgba(30,58,138,0.55)"); g.addColorStop(1, "rgba(30,58,138,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Faixa verde, amarela e azul no topo
    [VERDE, OURO, AZUL_BR].forEach((cor, i) => { ctx.fillStyle = cor; ctx.fillRect((W / 3) * i, 0, W / 3 + 1, 14); });

    // Logo ou iniciais
    const ax = 72, ay = 112, lado = 300;
    retangulo(ctx, ax, ay, lado, lado, 40);
    if (imgLogo) {
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.save(); ctx.clip();
      const esc = Math.min((lado - 12) / imgLogo.naturalWidth, (lado - 12) / imgLogo.naturalHeight);
      const w = imgLogo.naturalWidth * esc, h = imgLogo.naturalHeight * esc;
      ctx.drawImage(imgLogo, ax + (lado - w) / 2, ay + (lado - h) / 2, w, h);
      ctx.restore();
    } else {
      const gr = ctx.createLinearGradient(ax, ay, ax + lado, ay + lado);
      gr.addColorStop(0, VERDE); gr.addColorStop(1, AZUL_BR);
      ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = `800 120px ${FONTE}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(iniciais(a.nome), ax + lado / 2, ay + lado / 2 + 6);
      ctx.textAlign = "left";
    }
    retangulo(ctx, ax, ay, lado, lado, 40);
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(251,191,36,0.6)"; ctx.stroke();

    // Textos
    const tx = 432, larg = W - tx - 72;
    ctx.textBaseline = "alphabetic";
    const nome = linhas(ctx, a.nome, larg, 78, 46, 2, 800);
    const prof = linhas(ctx, a.profissao, larg, 40, 28, 1, 600);
    const altNome = nome.res.length * nome.t * 1.08;
    const bloco = altNome + 14 + prof.t * 1.2 + 14 + 32 * 1.2;
    let y = ay + lado / 2 - bloco / 2;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff"; ctx.font = `800 ${nome.t}px ${FONTE}`;
    nome.res.forEach((l) => { ctx.fillText(l, tx, y); y += nome.t * 1.08; });
    y += 14;
    ctx.fillStyle = OURO; ctx.font = `600 ${prof.t}px ${FONTE}`;
    ctx.fillText(prof.res[0], tx, y);
    y += prof.t * 1.2 + 14;
    ctx.fillStyle = "#cbd5e1"; ctx.font = `400 32px ${FONTE}`;
    ctx.fillText(`${a.cidade} · ${a.uf}`, tx, y);
    ctx.textBaseline = "alphabetic";

    // Rodapé com a marca
    const ry = H - 112;
    ctx.fillStyle = "rgba(2,6,23,0.45)"; ctx.fillRect(0, ry, W, 112);
    ctx.fillStyle = "rgba(148,163,184,0.18)"; ctx.fillRect(0, ry, W, 2);
    retangulo(ctx, 72, ry + 24, 64, 64, 14);
    ctx.save(); ctx.clip();
    ctx.fillStyle = OURO; ctx.fillRect(72, ry + 24, 64, 64);
    ctx.fillStyle = VERDE; ctx.fillRect(72, ry + 24 + 51, 64, 13);
    ctx.restore();
    ctx.fillStyle = AZUL_BR; ctx.font = `800 29px ${FONTE}`; ctx.textAlign = "center";
    ctx.fillText("VK", 72 + 32, ry + 24 + 38);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff"; ctx.font = `800 32px ${FONTE}`;
    ctx.fillText("VOTONI KEM", 156, ry + 54);
    ctx.fillStyle = "#94a3b8"; ctx.font = `600 20px ${FONTE}`;
    ctx.fillText("Diretório de negócios e serviços", 156, ry + 82);
    const cta = a.semWhatsapp ? "Visite o site" : "Fale direto pelo WhatsApp";
    ctx.font = `800 28px ${FONTE}`;
    const cw = ctx.measureText(cta).width + 60;
    retangulo(ctx, W - 72 - cw, ry + 25, cw, 62, 31);
    ctx.fillStyle = "#22c55e"; ctx.fill();
    ctx.fillStyle = "#052e16"; ctx.fillText(cta, W - 72 - cw + 30, ry + 66);

    return new Promise((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error("conversao"))), "image/jpeg", 0.86));
  }

  window.VKPrevia = { gerar };
})();
