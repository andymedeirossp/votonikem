// /api/og?slug=<slug> → imagem 1200×630 (PNG) usada na prévia do link de cada anúncio.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "@vercel/og";
import { buscarAnuncio, logoConfiavel, resumir, slugValido } from "../lib/anuncio.js";

const fonte = (peso) => readFileSync(join(process.cwd(), "api/_lib/fonts", `inter-${peso}.woff`));
let fontes;
const carregarFontes = () => (fontes ??= [400, 600, 800].map((weight) => ({
  name: "Inter", data: fonte(weight), weight, style: "normal"
})));

// Elemento no formato que o @vercel/og entende (sem JSX)
const h = (type, style, ...children) => ({
  type, props: { style: { display: "flex", ...style }, children: children.flat().filter((c) => c !== null && c !== false) }
});
const img = (src, style) => ({ type: "img", props: { src, style } });

const AZUL = "#0f172a", OURO = "#fbbf24", VERDE = "#16a34a", AZUL_BR = "#1e3a8a";

const iniciais = (nome) => String(nome || "?").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/)
  .filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

async function logoComoDataUri(url) {
  if (!logoConfiavel(url)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const tipo = (r.headers.get("content-type") || "").split(";")[0];
    // O gerador de imagem não lê WEBP (logos antigos): nesse caso ficam as iniciais
    if (!/^image\/(png|jpeg)$/.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 400 * 1024) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

const seloVK = (tam) => h("div", {
  width: tam, height: tam, borderRadius: tam * 0.22, background: OURO, overflow: "hidden",
  flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative"
},
  h("div", { color: AZUL_BR, fontSize: tam * 0.46, fontWeight: 800, letterSpacing: -1, marginTop: -tam * 0.08 }, "VK"),
  h("div", { position: "absolute", left: 0, right: 0, bottom: 0, height: tam * 0.2, background: VERDE }));

function cartao(a, logo) {
  const nome = resumir(a.nome, 48);
  const tamNome = nome.length > 32 ? 58 : nome.length > 22 ? 68 : 78;
  const avatar = logo
    ? h("div", { width: 300, height: 300, borderRadius: 40, background: "#ffffff", overflow: "hidden", alignItems: "center", justifyContent: "center", border: "6px solid rgba(251,191,36,0.6)" },
        img(logo, { width: 288, height: 288, objectFit: "contain" }))
    : h("div", { width: 300, height: 300, borderRadius: 40, alignItems: "center", justifyContent: "center",
        backgroundImage: `linear-gradient(135deg, ${VERDE}, ${AZUL_BR})`, border: "6px solid rgba(251,191,36,0.6)",
        color: "#ffffff", fontSize: 120, fontWeight: 800 }, iniciais(a.nome));

  const selo = a.status === "verificado"
    ? h("div", { background: "rgba(22,163,74,0.18)", color: "#4ade80", border: "2px solid rgba(74,222,128,0.5)", borderRadius: 999, padding: "8px 22px", fontSize: 26, fontWeight: 600 }, "Verificado")
    : null;
  const destaque = a.destaque
    ? h("div", { background: OURO, color: AZUL, borderRadius: 999, padding: "8px 22px", fontSize: 26, fontWeight: 800 }, "Destaque")
    : null;

  return h("div", {
    width: 1200, height: 630, flexDirection: "column", background: AZUL, fontFamily: "Inter", color: "#ffffff",
    backgroundImage: "radial-gradient(circle at 85% 10%, rgba(22,163,74,0.28), transparent 45%), radial-gradient(circle at 10% 100%, rgba(30,58,138,0.55), transparent 55%)"
  },
    // Faixa verde e amarela no topo
    h("div", { height: 14, width: "100%" },
      h("div", { flex: 1, background: VERDE }), h("div", { flex: 1, background: OURO }), h("div", { flex: 1, background: AZUL_BR })),
    h("div", { flex: 1, alignItems: "center", padding: "0 72px", gap: 60 },
      avatar,
      h("div", { flex: 1, flexDirection: "column", gap: 18 },
        h("div", { gap: 14 }, destaque, selo),
        h("div", { fontSize: tamNome, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }, nome),
        h("div", { fontSize: 40, fontWeight: 600, color: OURO }, resumir(a.profissao, 40)),
        h("div", { fontSize: 32, color: "#cbd5e1" }, `${resumir(a.cidade, 34)} · ${a.uf}`))),
    h("div", { height: 112, alignItems: "center", justifyContent: "space-between", padding: "0 72px", borderTop: "2px solid rgba(148,163,184,0.18)", background: "rgba(2,6,23,0.45)" },
      h("div", { alignItems: "center", gap: 20 },
        seloVK(64),
        h("div", { flexDirection: "column" },
          h("div", { fontSize: 32, fontWeight: 800, letterSpacing: 2 }, "VOTONI KEM"),
          h("div", { fontSize: 20, color: "#94a3b8", fontWeight: 600 }, "Diretório de negócios e serviços"))),
      h("div", { background: "#22c55e", color: "#052e16", borderRadius: 999, padding: "14px 30px", fontSize: 28, fontWeight: 800 }, "Fale direto pelo WhatsApp")));
}

export async function GET(request) {
  const slug = (new URL(request.url).searchParams.get("slug") || "").toLowerCase();
  let a = null;
  try { a = slugValido(slug) ? await buscarAnuncio(slug) : null; } catch (err) { console.error("Imagem do anúncio:", err.message); }
  if (!a) return Response.redirect(new URL("/img/og-image.jpg", request.url), 302);

  const logo = await logoComoDataUri(a.logo_url);
  const opcoes = {
    width: 1200, height: 630, fonts: carregarFontes(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" }
  };
  return new ImageResponse(cartao(a, logo), opcoes);
}
