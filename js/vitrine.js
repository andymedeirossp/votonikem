// Página inicial: mostra os anúncios publicados (destaque e verificados primeiro).
(() => {
  const LIMITE = 8;
  document.addEventListener("DOMContentLoaded", async () => {
    const VK = window.VK;
    const lista = document.getElementById("vitrine");
    const vazia = document.getElementById("vitrine-vazia");
    if (!VK || !lista) return;
    try {
      const p = new URLSearchParams({ select: VK.COLUNAS, order: "destaque.desc,status.desc,criado_em.desc", limit: String(LIMITE) });
      const { itens } = await VK.consultar(p.toString());
      if (!itens.length) { vazia.classList.remove("hidden"); return; }
      lista.innerHTML = itens.map((a) => VK.cardAnuncio(a)).join("");
    } catch (err) {
      console.error("Vitrine:", err);
      vazia.classList.remove("hidden");
    }
  });
})();
