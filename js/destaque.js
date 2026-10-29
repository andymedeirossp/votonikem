// Contratação do Destaque: PIX de valor fixo + comprovante pelo WhatsApp do projeto.
// A ativação é manual (colunas destaque e destaque_ate no Supabase); o destaque vence sozinho.
(() => {
  const VALOR = 9.9;
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", () => {
    const modal = $("modal-destaque");
    if (!modal || typeof modal.showModal !== "function") return;
    const CFG = window.VOTONIKEM_CONFIG || {};
    let codigo = "";

    const atualizarZap = () => {
      const zap = String(CFG.WHATSAPP_CONTATO || "").replace(/\D/g, "");
      const anuncio = $("destaque-anuncio").value.trim().slice(0, 200);
      const texto = `Olá! Quero o Destaque de 30 dias (R$ 9,90) no VotoniKem.\nMeu anúncio: ${anuncio || "(informar)"}\nSegue o comprovante do PIX:`;
      const link = $("destaque-zap");
      link.href = zap ? `https://wa.me/${zap}?text=${encodeURIComponent(texto)}` : "mailto:dpo@votonikem.com.br?subject=" + encodeURIComponent("Destaque VotoniKem") + "&body=" + encodeURIComponent(texto);
      link.textContent = zap ? "Enviar comprovante pelo WhatsApp" : "Enviar comprovante por e-mail";
    };

    const abrir = () => {
      if (!codigo && window.__gerarPix) {
        codigo = window.__gerarPix(VALOR, "DESTAQUE VOTONIKEM");
        $("destaque-copia").value = codigo;
        if (window.QRCode) new QRCode($("destaque-qr"), { text: codigo, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
        else $("destaque-qr").classList.add("hidden");
      }
      if (window.VKUltimoAnuncio && !$("destaque-anuncio").value) $("destaque-anuncio").value = window.VKUltimoAnuncio;
      atualizarZap();
      modal.showModal();
    };

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-abrir-destaque]")) { e.preventDefault(); abrir(); }
      else if (e.target.closest("[data-fechar-destaque]")) modal.close();
    });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); }); // clique fora fecha
    $("destaque-anuncio").addEventListener("input", atualizarZap);

    $("destaque-copiar").addEventListener("click", async () => {
      const botao = $("destaque-copiar");
      try { await navigator.clipboard.writeText(codigo); } catch {
        $("destaque-copia").select(); document.execCommand("copy");
      }
      botao.textContent = "Código copiado!";
      setTimeout(() => (botao.textContent = "Copiar código PIX"), 2000);
    });
  });
})();
