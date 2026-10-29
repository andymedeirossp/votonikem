// Monta a pasta dist/ com só o que vai para o ar (Cloudflare Pages: comando "npm run build", saída "dist").
// Código das funções (functions/ e lib/), banco (supabase/) e configurações ficam de fora.
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";

const SAIDA = "dist";
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA);

const arquivos = readdirSync(".").filter((f) => /\.(html|txt|xml)$/.test(f) && f !== "README.md");
for (const f of [...arquivos, "_headers"]) cpSync(f, `${SAIDA}/${f}`);
for (const pasta of ["css", "js", "img"]) cpSync(pasta, `${SAIDA}/${pasta}`, { recursive: true, filter: (f) => !f.endsWith("tailwind.src.css") });

console.log(`dist/ pronto: ${readdirSync(SAIDA).join(", ")}`);
