// Formulário "Publique seu negócio": consulta o CNPJ, prepara o logo e publica o anúncio no Supabase.
(() => {
  const CFG = window.VOTONIKEM_CONFIG || {};
  const VERSAO_CONSENTIMENTO = "2026-10-29-anuncio-v1"; // publicação + consentimento específico art. 11
  const LOGO_LADO = 400;     // px (quadrado)
  const LOGO_MAX_ENTRADA = 8 * 1024 * 1024; // 8 MB antes de reduzir

  const $ = (id) => document.getElementById(id);
  const chave = () => CFG.SUPABASE_ANON_KEY || "";
  const configurado = () => CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("SEU-PROJETO") && chave() && !chave().includes("SUA_CHAVE");
  const cabecalhos = (extra = {}) => ({
    apikey: chave(),
    ...(chave().startsWith("eyJ") ? { Authorization: `Bearer ${chave()}` } : {}),
    ...extra
  });

  /* ---------- utilitários ---------- */

  const so_digitos = (v) => String(v || "").replace(/\D/g, "");

  const mascararCnpj = (v) => {
    const d = so_digitos(v).slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const cnpjValido = (v) => {
    const c = so_digitos(v);
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
    const dv = (base) => {
      const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = base.split("").reduce((s, n, i) => s + Number(n) * pesos[i], 0);
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    const d1 = dv(c.slice(0, 12));
    const d2 = dv(c.slice(0, 12) + d1);
    return c.endsWith(`${d1}${d2}`);
  };

  const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "em"]);
  const tituloSeMaiusculo = (t) => {
    t = String(t || "").trim();
    if (!t || t !== t.toUpperCase()) return t; // respeita o que já vem formatado
    return t.toLowerCase().split(/\s+/).map((p, i) =>
      i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  };

  // Nome de MEI costuma vir como "12.345.678 Fulano de Tal": não exibimos números do CNPJ
  const limparNomeMei = (n) => String(n || "").replace(/^\s*\d{2}\.?\d{3}\.?\d{3}\s+/, "").trim();

  const normalizarSite = (v) => {
    let s = String(v || "").trim().replace(/\s+/g, "");
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    return /^https?:\/\/[^\s/.]+\.[^\s]{2,}/i.test(s) ? s.slice(0, 200) : null;
  };

  const normalizarInstagram = (v) => {
    const s = String(v || "").trim();
    if (!s) return "";
    const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    if (m) return "@" + m[1];
    if (/^@?[A-Za-z0-9._]{1,30}$/.test(s)) return s.startsWith("@") ? s : "@" + s;
    return s.slice(0, 120);
  };

  const escapar = (t) => String(t || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const iniciais = (nome) => {
    const partes = nome.trim().split(/\s+/).filter((p) => !MINUSCULAS.has(p.toLowerCase()) && /\w/.test(p));
    return (partes.length ? partes : [nome]).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  };

  /* ---------- tipo de anunciante ---------- */

  const form = $("anuncio-form");
  if (!form) return;

  const tipoAtual = () => form.querySelector('input[name="tipo"]:checked').value;
  const atualizarTipo = () => {
    const empresa = tipoAtual() === "empresa";
    $("bloco-cnpj").hidden = !empresa;
    $("an-cnpj").required = empresa;
  };
  form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener("change", atualizarTipo));
  atualizarTipo();

  /* ---------- CNPJ: consulta pública da Receita (BrasilAPI) ---------- */

  let receita = null;          // { razao_social, situacao, ok } da última consulta
  let cnpjConsultado = "";
  const infoCnpj = (msg, tipo = "neutro") => {
    const el = $("an-cnpj-info");
    el.textContent = msg;
    el.className = "text-[11px] mt-1.5 " + ({ ok: "text-emerald-400", erro: "text-red-400", aviso: "text-amber-400" }[tipo] || "text-slate-400");
  };

  const consultarCnpj = async () => {
    const c = so_digitos($("an-cnpj").value);
    if (c.length < 14) { receita = null; cnpjConsultado = ""; return; }
    if (c === cnpjConsultado) return;
    cnpjConsultado = c;
    if (!cnpjValido(c)) { receita = null; return infoCnpj("Este CNPJ não é válido. Confira os números.", "erro"); }
    infoCnpj("Consultando a Receita...");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 404) { receita = { ok: false, situacao: "NÃO ENCONTRADO" }; return infoCnpj("CNPJ não encontrado na Receita. Confira os números.", "erro"); }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const situacao = String(d.descricao_situacao_cadastral || "").toUpperCase();
      receita = { ok: situacao === "ATIVA", situacao, razao_social: d.razao_social || "" };
      if (!receita.ok) return infoCnpj(`Este CNPJ está "${situacao.toLowerCase()}" na Receita. Só publicamos empresas com CNPJ ativo.`, "erro");
      // Preenche o que estiver vazio
      const nomeSugerido = tituloSeMaiusculo(limparNomeMei(d.nome_fantasia || d.razao_social));
      if (!$("an-nome").value.trim() && nomeSugerido) $("an-nome").value = nomeSugerido.slice(0, 80);
      if (!$("an-uf").value && d.uf) $("an-uf").value = d.uf;
      if (!$("an-cidade").value.trim() && d.municipio) $("an-cidade").value = tituloSeMaiusculo(d.municipio);
      infoCnpj(`✓ CNPJ ativo na Receita · ${tituloSeMaiusculo(d.municipio || "")}/${d.uf || ""}. Confira o nome e a cidade abaixo.`, "ok");
    } catch (e) {
      receita = { ok: true, situacao: "NAO_CONSULTADO" }; // segue; a moderação confere depois
      infoCnpj("Não conseguimos consultar a Receita agora. Pode seguir: conferimos depois.", "aviso");
    }
  };

  $("an-cnpj").addEventListener("input", (e) => {
    e.target.value = mascararCnpj(e.target.value);
    if (so_digitos(e.target.value).length === 14) consultarCnpj();
    else { receita = null; cnpjConsultado = ""; infoCnpj("Conferimos na Receita e preenchemos o nome e a cidade para você."); }
  });

  /* ---------- campos ---------- */

  const zap = $("an-whatsapp");
  zap.addEventListener("input", () => { zap.value = (window.VKmascararZap || ((v) => v))(zap.value); });

  const desc = $("an-descricao");
  desc.addEventListener("input", () => { $("an-descricao-cont").textContent = desc.value.length; });

  /* ---------- logo: recorta em quadrado e reduz antes de enviar ---------- */

  let logoBlob = null;
  let logoLocal = ""; // endereço da imagem no próprio aparelho, para a prévia
  const previaLogo = $("an-logo-previa");

  const prepararLogo = (arquivo) => new Promise((ok, falha) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(arquivo.type)) return falha(new Error("formato"));
    if (arquivo.size > LOGO_MAX_ENTRADA) return falha(new Error("tamanho"));
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 2;
      const c = document.createElement("canvas");
      c.width = c.height = LOGO_LADO;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff"; // fundo branco para logos com transparência em JPEG
      ctx.fillRect(0, 0, LOGO_LADO, LOGO_LADO);
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LOGO_LADO, LOGO_LADO);
      URL.revokeObjectURL(url);
      // JPEG: funciona em todo lugar, inclusive na imagem de prévia do link no WhatsApp
      c.toBlob((j) => (j ? ok(j) : falha(new Error("conversao"))), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("leitura")); };
    img.src = url;
  });

  $("an-logo").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    logoBlob = null;
    logoLocal = "";
    previaLogo.style.backgroundImage = "";
    previaLogo.textContent = "Logo";
    if (!f) return;
    try {
      logoBlob = await prepararLogo(f);
      logoLocal = URL.createObjectURL(logoBlob);
      previaLogo.style.backgroundImage = `url(${logoLocal})`;
      previaLogo.textContent = "";
    } catch (err) {
      e.target.value = "";
      mostrarErro(err.message === "tamanho" ? "A imagem do logo é muito grande (máximo 8 MB)." : "Use um logo em JPG, PNG ou WEBP.");
    }
  });

  const enviarLogo = async () => {
    if (!logoBlob) return null;
    const ext = logoBlob.type === "image/webp" ? "webp" : "jpg";
    const caminho = `anuncios/${crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)}.${ext}`;
    const r = await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/logos/${caminho}`, {
      method: "POST",
      headers: cabecalhos({ "Content-Type": logoBlob.type, "x-upsert": "false" }),
      body: logoBlob
    });
    if (!r.ok) throw new Error(`logo HTTP ${r.status}`);
    return `${CFG.SUPABASE_URL}/storage/v1/object/public/logos/${caminho}`;
  };

  /* ---------- envio ---------- */

  const mostrarErro = (msg) => {
    const el = $("an-erro");
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
    if (msg) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const cardAnuncio = (a) => {
    const avatar = a.logo_url
      ? `<div class="avatar avatar-logo" style="background-image:url('${escapar(a.logo_url)}')"></div>`
      : `<div class="avatar bg-gradient-to-br from-emerald-400 to-green-700">${escapar(iniciais(a.nome))}</div>`;
    const links = [
      a.instagram ? `<span class="btn-link btn-insta">Instagram</span>` : "",
      a.site ? `<span class="btn-link btn-site">Site</span>` : ""
    ].join("");
    return `<article class="anuncio anuncio-real bg-[#0d1424] border border-slate-700 rounded-2xl p-5 flex flex-col text-left">
      <div class="flex items-center gap-3 mb-4">${avatar}
        <div class="min-w-0"><h3 class="text-sm font-extrabold text-white truncate">${escapar(a.nome)}</h3>
        <p class="text-[11px] text-slate-400">${escapar(a.cidade)} · ${escapar(a.uf)}</p></div></div>
      <div class="flex flex-wrap gap-1.5 mb-3"><span class="tag-prof">${escapar(a.profissao)}</span><span class="tag-verificando">Em verificação</span></div>
      ${a.descricao ? `<p class="text-xs text-slate-400 leading-relaxed mb-5">${escapar(a.descricao)}</p>` : ""}
      <div class="space-y-2"><span class="btn-zap">WhatsApp</span>${links ? `<div class="flex gap-2">${links}</div>` : ""}</div>
    </article>`;
  };

  let publicado = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarErro("");
    if (form.confirmar_email.value) return; // robô

    const tipo = tipoAtual();
    const cnpj = so_digitos($("an-cnpj").value);
    const site = normalizarSite($("an-site").value);
    const dados = {
      tipo,
      nome: limparNomeMei($("an-nome").value).slice(0, 80),
      profissao: $("an-profissao").value.trim().slice(0, 80),
      descricao: desc.value.trim().slice(0, 400) || null,
      uf: $("an-uf").value,
      cidade: $("an-cidade").value.trim().slice(0, 80),
      whatsapp: so_digitos(zap.value),
      instagram: normalizarInstagram($("an-instagram").value) || null,
      site: site || null,
      email: $("an-email").value.trim().toLowerCase(),
      consentimento: $("an-consentimento").checked,
      consentimento_versao: VERSAO_CONSENTIMENTO,
      origem: (document.referrer || "direto").slice(0, 200)
    };

    if (tipo === "empresa") {
      if (!cnpjValido(cnpj)) return mostrarErro("Informe um CNPJ válido, ou escolha \"Sou autônomo\".");
      if (cnpj !== cnpjConsultado) await consultarCnpj();
      if (receita && !receita.ok) return mostrarErro("Só publicamos empresas com CNPJ ativo na Receita.");
      dados.cnpj = cnpj;
      if (receita && receita.razao_social) dados.razao_social = receita.razao_social.slice(0, 160);
      if (receita && receita.situacao) dados.cnpj_situacao = receita.situacao.slice(0, 40);
    }
    if (dados.nome.length < 3) return mostrarErro("Informe o nome do negócio como deve aparecer.");
    if (dados.profissao.length < 2) return mostrarErro("Informe sua profissão ou área de atuação.");
    if (!/^\d{10,11}$/.test(dados.whatsapp)) return mostrarErro("Informe um WhatsApp válido com DDD.");
    if (!dados.uf) return mostrarErro("Selecione o estado.");
    if (dados.cidade.length < 2) return mostrarErro("Informe a cidade.");
    if (site === null) return mostrarErro("O endereço do site parece incompleto. Ex: www.seusite.com.br (ou deixe em branco).");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) return mostrarErro("Informe um e-mail válido.");
    if (!dados.consentimento) return mostrarErro("Marque a autorização para publicarmos o seu anúncio.");
    if (!configurado()) return mostrarErro("O cadastro está em configuração. Tente novamente em instantes.");

    const botao = $("an-enviar");
    botao.disabled = true;
    $("an-enviar-texto").textContent = "Publicando...";
    try {
      try {
        dados.logo_url = await enviarLogo();
      } catch (err) {
        console.error("Falha ao enviar logo:", err);
        dados.logo_url = null; // publica sem logo; dá para incluir depois
      }
      // A função publicar_anuncio grava e devolve só o slug (o site não pode ler dados privados)
      const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/publicar_anuncio`, {
        method: "POST",
        headers: cabecalhos({ "Content-Type": "application/json" }),
        body: JSON.stringify({ p: dados })
      });
      if (r.status === 409) return mostrarErro("Este CNPJ já tem um anúncio no VotoniKem. Se for seu e quiser alterar, fale com a gente pelo dpo@votonikem.com.br.");
      if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
      const slug = await r.json();
      publicado = { ...dados, slug: typeof slug === "string" ? slug : null };

      form.classList.add("hidden");
      const previa = { ...publicado, status: "em_verificacao", destaque: false, logo_url: publicado.logo_url ? logoLocal || publicado.logo_url : "" };
      $("an-previa").innerHTML = window.VK ? window.VK.cardAnuncio(previa, { link: false, contatos: false }) : cardAnuncio(previa);
      const ver = $("an-ver-anuncio");
      if (ver && publicado.slug) { ver.href = `/a/${encodeURIComponent(publicado.slug)}`; ver.classList.remove("hidden"); ver.classList.add("inline-flex"); }
      $("an-sucesso").classList.remove("hidden");
      $("an-sucesso").scrollIntoView({ behavior: "smooth", block: "start" });
      const texto = `Meu negócio agora está no VotoniKem, o diretório de negócios de quem compartilha os mesmos valores: ${location.origin}${publicado.slug ? "/a/" + encodeURIComponent(publicado.slug) : ""}`;
      $("btn-compartilhar").href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
      $("btn-abrir-kit").classList.toggle("hidden", !window.VotoniKit);
      if (window.soltarConfete) {
        const b = $("an-sucesso").getBoundingClientRect();
        window.soltarConfete(b.left + b.width / 2, b.top + 40, 90);
      }
    } catch (err) {
      console.error("Erro ao publicar anúncio:", err);
      mostrarErro("Não foi possível publicar agora. Verifique sua conexão e tente de novo.");
    } finally {
      botao.disabled = false;
      $("an-enviar-texto").textContent = "Publicar meu anúncio grátis";
    }
  });

  $("btn-abrir-kit").addEventListener("click", () => {
    if (!publicado || !window.VotoniKit) return;
    window.VotoniKit.abrir({
      nome: publicado.nome, profissao: publicado.profissao, cidade: publicado.cidade, uf: publicado.uf,
      whatsapp: publicado.whatsapp, rede_social: publicado.instagram || "", site: publicado.site || ""
    });
  });

  window.__vkAnunciar = { cnpjValido, limparNomeMei, normalizarInstagram, tituloSeMaiusculo }; // usado nos testes
})();
