// Configurações públicas do site.
// Tudo aqui é visível no navegador — não coloque senhas nem a chave "service_role".
window.VOTONIKEM_CONFIG = {
  // Supabase → Project Settings → API (ou "Connect")
  SUPABASE_URL: "https://jmvdgwtvyubwmhfyqras.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_kWlOHA3mmh4vetrifiDUcg_6HeTk9_B",

  // PIX — os dados precisam bater com o cadastro da chave no banco
  PIX_CHAVE: "12608403000105",            // chave CNPJ (só números)
  PIX_RECEBEDOR: "ANDERSON DE SA MEDEIROS", // titular, até 25 caracteres, sem acentos
  PIX_CIDADE: "SAO PAULO",                  // cidade do titular, até 15 caracteres, sem acentos
  PIX_DESCRICAO: "APOIO VOTONIKEM",

  // WhatsApp do projeto para dúvidas (DDI + DDD + número, só dígitos, ex: "5511999998888").
  // Enquanto estiver vazio, os botões de WhatsApp do site ficam escondidos.
  WHATSAPP_CONTATO: "",

  // Meta do servidor: valores reserva. O site lê a meta real da tabela meta_arrecadacao
  // no Supabase (Table Editor), então normalmente não é preciso mudar aqui.
  META_ARRECADADO: 240,
  META_TOTAL: 600,
  // A barra e os valores só aparecem quando a arrecadação passar desta porcentagem da meta
  META_MIN_PCT_EXIBIR: 15
};
