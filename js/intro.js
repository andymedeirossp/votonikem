// Abertura: partículas verde-amarelas se juntam formando o logo VK.
// Curta (cerca de 2,3 s), pulável com toque/clique/tecla e exibida só uma vez por sessão.
// O <head> já decidiu se deve mostrar (classe "intro-ativa" no <html>).
(() => {
  const raiz = document.documentElement;
  if (!raiz.classList.contains("intro-ativa")) return;

  const CORES = ["#16a34a", "#22c55e", "#facc15", "#fde047", "#f59e0b", "#ffffff"];
  const DURACAO_FORMAR = 1100;  // ms até o VK se formar
  const DURACAO_TOTAL = 2300;   // ms até a página aparecer

  const camada = document.createElement("div");
  camada.className = "intro-camada";
  camada.setAttribute("aria-hidden", "true");
  camada.innerHTML = `<canvas></canvas>
    <p class="intro-lema">PÁTRIA • LIBERDADE • UNIÃO</p>
    <button type="button" class="intro-pular">Pular</button>`;
  document.body.appendChild(camada);
  const canvas = camada.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  let W, H, dpr, particulas = [], inicio = 0, encerrando = false, encerrado = false;

  const ajustar = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Desenha "VK" fora da tela e usa os pixels preenchidos como destino das partículas
  const pontosDoLogo = () => {
    const tam = Math.min(W * 0.62, H * 0.42, 340);
    const off = document.createElement("canvas");
    off.width = Math.ceil(tam * 1.5); off.height = Math.ceil(tam * 1.05);
    const o = off.getContext("2d");
    o.fillStyle = "#000";
    o.textAlign = "center"; o.textBaseline = "middle";
    o.font = `900 ${tam}px Inter, 'Helvetica Neue', Arial, sans-serif`;
    o.fillText("VK", off.width / 2, off.height / 2 + tam * 0.04);
    const dados = o.getImageData(0, 0, off.width, off.height).data;
    const passo = Math.max(4, Math.round(tam / 52));
    const pts = [];
    for (let y = 0; y < off.height; y += passo) {
      for (let x = 0; x < off.width; x += passo) {
        if (dados[(y * off.width + x) * 4 + 3] > 128) {
          pts.push({ x: W / 2 - off.width / 2 + x, y: H * 0.44 - off.height / 2 + y });
        }
      }
    }
    return { pts, passo };
  };

  const criar = () => {
    const { pts, passo } = pontosDoLogo();
    particulas = pts.map((p) => {
      const a = Math.random() * Math.PI * 2;
      const dist = Math.max(W, H) * (0.55 + Math.random() * 0.5);
      return {
        x: W / 2 + Math.cos(a) * dist, y: H / 2 + Math.sin(a) * dist,
        alvoX: p.x, alvoY: p.y,
        vx: 0, vy: 0,
        t: passo * (0.55 + Math.random() * 0.45),
        cor: CORES[(Math.random() * CORES.length) | 0],
        atraso: Math.random() * 320
      };
    });
  };

  const quadro = (agora) => {
    if (encerrado) return;
    if (!inicio) inicio = agora;
    const t = agora - inicio;
    ctx.clearRect(0, 0, W, H);
    for (const p of particulas) {
      if (encerrando) {
        p.vx *= 1.04; p.vy = p.vy * 1.04 + 0.05;
      } else if (t > p.atraso) {
        // mola em direção ao destino
        p.vx = (p.vx + (p.alvoX - p.x) * 0.045) * 0.82;
        p.vy = (p.vy + (p.alvoY - p.y) * 0.045) * 0.82;
        // leve respiração depois de formado
        if (t > DURACAO_FORMAR) {
          p.vx += Math.sin((t + p.atraso * 10) / 260) * 0.05;
          p.vy += Math.cos((t + p.atraso * 10) / 300) * 0.05;
        }
      }
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t);
    }
    if (t > DURACAO_FORMAR - 150) camada.classList.add("intro-formado");
    if (t > DURACAO_TOTAL && !encerrando) encerrar();
    requestAnimationFrame(quadro);
  };

  const encerrar = () => {
    if (encerrando) return;
    encerrando = true;
    // espalha as partículas para fora
    for (const p of particulas) {
      const a = Math.atan2(p.y - H * 0.44, p.x - W / 2) + (Math.random() - 0.5) * 0.6;
      const v = 6 + Math.random() * 10;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
    }
    camada.classList.add("intro-saindo");
    raiz.classList.remove("intro-ativa");
    setTimeout(() => { encerrado = true; camada.remove(); }, 650);
  };

  const pular = () => encerrar();
  camada.addEventListener("pointerdown", pular);
  addEventListener("keydown", pular, { once: true });
  addEventListener("resize", () => { if (!encerrando) { ajustar(); criar(); } });

  ajustar();
  // espera a fonte do logo carregar (no máximo 450 ms) para o VK sair certo
  const fonte = (document.fonts && document.fonts.load ? document.fonts.load("900 100px Inter") : Promise.resolve())
    .catch(() => {}); // se a fonte falhar, segue com a fonte reserva
  Promise.race([fonte, new Promise((r) => setTimeout(r, 450))]).finally(() => {
    criar();
    requestAnimationFrame(quadro);
  });
})();
