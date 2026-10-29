// Cards com inclinação 3D e reflexo de luz que seguem o mouse.
// Só em computadores (mouse/trackpad) e quando a pessoa não pediu para reduzir movimento.
(() => {
  const SELETOR = ".beneficio, .passo, .anuncio, .plano";
  const INCLINACAO_MAX = 9; // graus

  const podeAnimar = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    if (!podeAnimar()) return;

    document.querySelectorAll(SELETOR).forEach((card) => {
      card.classList.add("card-3d");
      let quadro = null;

      const atualizar = (e) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;   // 0 a 1
        const ny = (e.clientY - r.top) / r.height;   // 0 a 1
        if (quadro) cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(() => {
          const rx = (0.5 - ny) * INCLINACAO_MAX * 2;
          const ry = (nx - 0.5) * INCLINACAO_MAX * 2;
          card.style.transform =
            `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px) scale(1.02)`;
          card.style.setProperty("--brilho-x", `${(nx * 100).toFixed(1)}%`);
          card.style.setProperty("--brilho-y", `${(ny * 100).toFixed(1)}%`);
        });
      };

      card.addEventListener("pointerenter", () => card.classList.add("card-3d-ativo"));
      card.addEventListener("pointermove", atualizar);
      card.addEventListener("pointerleave", () => {
        if (quadro) cancelAnimationFrame(quadro);
        card.classList.remove("card-3d-ativo");
        card.style.transform = "";
      });
    });
  });
})();
