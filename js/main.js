// URL do Link de Pagamento do Asaas (Insira aqui o seu link real do Asaas)
const ASAAS_PAYMENT_URL = "https://www.asaas.com/c/SEU_LINK_AQUI";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Configura o Link do Asaas
  const btnAssinar = document.getElementById("btn-assinar");
  if (btnAssinar) {
    btnAssinar.href = ASAAS_PAYMENT_URL;
  }

  // 2. Funcionalidade de Copiar Chave PIX
  const btnCopyPix = document.getElementById("btn-copy-pix");
  const pixKeyElement = document.getElementById("pix-key");

  if (btnCopyPix && pixKeyElement) {
    btnCopyPix.addEventListener("click", () => {
      const pixKeyText = pixKeyElement.innerText;

      navigator.clipboard.writeText(pixKeyText).then(() => {
        const originalText = btnCopyPix.innerText;
        btnCopyPix.innerText = "Copiado!";
        btnCopyPix.classList.add("bg-emerald-600", "text-white");

        setTimeout(() => {
          btnCopyPix.innerText = originalText;
          btnCopyPix.classList.remove("bg-emerald-600", "text-white");
        }, 2000);
      }).catch(err => {
        console.error("Erro ao copiar chave PIX: ", err);
      });
    });
  }

  // 3. Gestão do Banner de Cookies (LGPD)
  const cookieBanner = document.getElementById("cookie-banner");
  const acceptCookiesBtn = document.getElementById("accept-cookies");

  const cookiesAccepted = localStorage.getItem("votonikem_cookies_accepted");

  if (!cookiesAccepted && cookieBanner) {
    setTimeout(() => {
      cookieBanner.classList.remove("translate-y-full", "opacity-0");
    }, 1000);
  }

  if (acceptCookiesBtn) {
    acceptCookiesBtn.addEventListener("click", () => {
      localStorage.setItem("votonikem_cookies_accepted", "true");
      cookieBanner.classList.add("translate-y-full", "opacity-0");
    });
  }
});