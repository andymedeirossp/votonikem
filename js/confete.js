// Confete verde, amarelo, azul e branco saindo de um ponto da tela.
// Leve (sem bibliotecas) e desligado para quem pede movimento reduzido.
(() => {
  const CORES = ["#009C3B", "#16a34a", "#FFDF00", "#facc15", "#002776", "#ffffff"];
  let canvas = null, ctx = null, pecas = [], rodando = false;

  const preparar = () => {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "9999"
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();
    addEventListener("resize", ajustar);
  };

  const quadro = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pecas = pecas.filter((p) => p.vida > 0 && p.y < innerHeight + 40);
    for (const p of pecas) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.32;          // gravidade
      p.x += p.vx + Math.sin(p.balanco) * 0.6;
      p.y += p.vy;
      p.balanco += 0.12;
      p.giro += p.vGiro;
      p.vida -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.vida / 40);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.scale(1, Math.cos(p.giro * 1.7)); // efeito de papel virando
      ctx.fillStyle = p.cor;
      if (p.forma === 0) ctx.fillRect(-p.t / 2, -p.t / 3, p.t, p.t * 0.66);
      else { ctx.beginPath(); ctx.arc(0, 0, p.t / 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (pecas.length) requestAnimationFrame(quadro);
    else { rodando = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };

  window.soltarConfete = (x, y, quantidade = 110) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    preparar();
    for (let i = 0; i < quantidade; i++) {
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const velocidade = 7 + Math.random() * 9;
      pecas.push({
        x, y,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        t: 7 + Math.random() * 7,
        cor: CORES[(Math.random() * CORES.length) | 0],
        forma: Math.random() < 0.75 ? 0 : 1,
        giro: Math.random() * Math.PI,
        vGiro: (Math.random() - 0.5) * 0.35,
        balanco: Math.random() * Math.PI * 2,
        vida: 140 + Math.random() * 60
      });
    }
    if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
  };

  // Aviso de agradecimento
  window.mostrarAviso = (texto) => {
    let aviso = document.getElementById("aviso-flutuante");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "aviso-flutuante";
      aviso.className = "aviso-flutuante";
      aviso.setAttribute("role", "status");
      aviso.setAttribute("aria-live", "polite");
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.remove("visivel");
    void aviso.offsetWidth; // reinicia a animação
    aviso.classList.add("visivel");
    clearTimeout(aviso._timer);
    aviso._timer = setTimeout(() => aviso.classList.remove("visivel"), 3200);
  };
})();
