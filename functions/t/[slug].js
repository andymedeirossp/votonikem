// Cloudflare Pages: /t/<slug> → página do profissional (talento.html).
// Fica fora do Google (noindex), para que pesquisar o nome da pessoa não leve ao VotoniKem.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  // Modo manutenção (scripts/build.mjs): leva para a página inicial
  if ((await env.ASSETS.fetch(new URL("/manutencao.txt", url))).ok) return Response.redirect(new URL("/", url), 302);
  const pagina = await env.ASSETS.fetch(new URL("/talento", url));
  const cabecalhos = new Headers(pagina.headers);
  cabecalhos.set("Content-Type", "text/html; charset=utf-8");
  cabecalhos.set("X-Robots-Tag", "noindex, nofollow");
  cabecalhos.set("Cache-Control", "public, max-age=300");
  return new Response(pagina.body, { status: pagina.status === 404 ? 404 : 200, headers: cabecalhos });
}
