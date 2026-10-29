// Menu de celular (☰): abre e fecha o painel de navegação do topo.
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById("btn-menu");
    const menu = document.getElementById("menu-celular");
    if (!botao || !menu) return;

    const abrir = () => {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("aberto"));
      botao.setAttribute("aria-expanded", "true");
      botao.setAttribute("aria-label", "Fechar menu");
      botao.classList.add("aberto");
    };
    const fechar = (devolverFoco = false) => {
      menu.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
      botao.setAttribute("aria-label", "Abrir menu");
      botao.classList.remove("aberto");
      setTimeout(() => { if (!menu.classList.contains("aberto")) menu.hidden = true; }, 250);
      if (devolverFoco) botao.focus();
    };
    const estaAberto = () => botao.getAttribute("aria-expanded") === "true";

    botao.addEventListener("click", () => (estaAberto() ? fechar() : abrir()));
    // Tocar num item fecha o menu (a página rola até a seção, ou a janela da LGPD abre)
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) fechar(); });
    // Tocar fora ou apertar Esc também fecha
    document.addEventListener("click", (e) => {
      if (estaAberto() && !menu.contains(e.target) && !botao.contains(e.target)) fechar();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && estaAberto()) fechar(true); });
    // Se a tela crescer para tamanho de computador, garante o menu fechado
    window.matchMedia("(min-width: 768px)").addEventListener("change", (m) => { if (m.matches) fechar(); });
  });
})();
