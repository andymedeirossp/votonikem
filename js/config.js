// Configurações públicas do site.
// Tudo aqui é visível no navegador — não coloque senhas nem a chave "service_role".
window.VOTONIKEM_CONFIG = {
  // Supabase → Project Settings → API (ou "Connect")
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_CHAVE_ANON_PUBLICA",

  // PIX — os dados precisam bater com o cadastro da chave no banco
  PIX_CHAVE: "pix@votonikem.com.br",
  PIX_RECEBEDOR: "VOTONIKEM",   // nome do titular, até 25 caracteres, sem acentos
  PIX_CIDADE: "SAO PAULO",      // cidade do titular, até 15 caracteres, sem acentos
  PIX_DESCRICAO: "APOIO VOTONIKEM",

  // Meta do servidor (atualize à mão por enquanto)
  META_ARRECADADO: 240,
  META_TOTAL: 600
};
