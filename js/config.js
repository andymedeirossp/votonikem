// Configurações públicas do site.
// Tudo aqui é visível no navegador — não coloque senhas nem a chave "service_role".
window.VOTONIKEM_CONFIG = {
  // Supabase → Project Settings → API (ou "Connect")
  SUPABASE_URL: "https://jmvdgwtvyubwmhfyqras.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_kWlOHA3mmh4vetrifiDUcg_6HeTk9_B",

  // PIX — os dados precisam bater com o cadastro da chave no banco
  PIX_CHAVE: "pix@votonikem.com.br",
  PIX_RECEBEDOR: "VOTONIKEM",   // nome do titular, até 25 caracteres, sem acentos
  PIX_CIDADE: "SAO PAULO",      // cidade do titular, até 15 caracteres, sem acentos
  PIX_DESCRICAO: "APOIO VOTONIKEM",

  // Meta do servidor (atualize à mão por enquanto)
  META_ARRECADADO: 240,
  META_TOTAL: 600
};
