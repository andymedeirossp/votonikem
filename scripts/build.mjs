// Monta a pasta dist/ com só o que vai para o ar (Cloudflare Pages: comando "npm run build", saída "dist").
// Código das funções (functions/ e lib/), banco (supabase/) e configurações ficam de fora.
//
// Modo manutenção: com "ativa": true em manutencao/config.json, o site publica só a página de
// entrada com o aviso (manutencao/index.html) e as páginas legais. Diretório, anúncios e cadastro
// saem do ar e levam para a página inicial. Para voltar com o site completo, troque para false.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const SAIDA = "dist";
const manutencao = JSON.parse(readFileSync("manutencao/config.json", "utf8")).ativa === true;

rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA);

const copiarPastas = () => {
  for (const pasta of ["css", "js", "img"]) cpSync(pasta, `${SAIDA}/${pasta}`, { recursive: true, filter: (f) => !f.endsWith("tailwind.src.css") });
};

if (manutencao) {
  for (const f of ["politica-de-privacidade.html", "termos-de-uso.html", "codigo-de-conduta.html", "404.html", "robots.txt", "_headers"]) cpSync(f, `${SAIDA}/${f}`);
  cpSync("manutencao/index.html", `${SAIDA}/index.html`);
  copiarPastas();
  writeFileSync(`${SAIDA}/manutencao.txt`, "ativa\n"); // as funções leem isto e mandam para a página inicial
  writeFileSync(`${SAIDA}/_redirects`, ["/diretorio / 302", "/diretorio.html / 302", "/anuncio / 302", "/anuncio.html / 302", ""].join("\n"));
} else {
  const arquivos = readdirSync(".").filter((f) => /\.(html|txt|xml)$/.test(f));
  for (const f of [...arquivos, "_headers"]) cpSync(f, `${SAIDA}/${f}`);
  copiarPastas();
}

console.log(`dist/ pronto${manutencao ? " (MODO MANUTENÇÃO)" : ""}: ${readdirSync(SAIDA).join(", ")}`);
