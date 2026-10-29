-- VotoniKem — Lista VIP de lançamento
-- Já aplicado no projeto Supabase "votonikem" (sa-east-1). Guardado aqui como referência.

create table if not exists public.leads (
  id            bigint generated always as identity primary key,
  nome          text        not null check (char_length(nome) between 3 and 120),
  whatsapp      text        not null check (whatsapp ~ '^[0-9]{10,11}$'),
  uf            char(2)     not null check (uf ~ '^[A-Z]{2}$'),
  cidade        text        not null check (char_length(cidade) between 2 and 80),
  rede_social   text        not null check (char_length(rede_social) between 2 and 120),
  consentimento boolean     not null check (consentimento = true),
  origem        text        check (char_length(origem) <= 200),
  criado_em     timestamptz not null default now()
);

-- Evita o mesmo WhatsApp entrar duas vezes na fila
create unique index if not exists leads_whatsapp_unico on public.leads (whatsapp);

-- Segurança: o site (chave pública "anon") só pode INSERIR.
-- Ninguém de fora consegue ler, alterar ou apagar os cadastros.
alter table public.leads enable row level security;

drop policy if exists "site pode inserir" on public.leads;
create policy "site pode inserir"
  on public.leads for insert
  to anon
  with check (consentimento = true);

revoke all on public.leads from anon;
grant insert (nome, whatsapp, uf, cidade, rede_social, consentimento, origem)
  on public.leads to anon;

-- Números públicos para a prova social do site (só totais, nenhum dado pessoal)
create or replace function public.estatisticas_fila()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'total',   (select count(*) from public.leads),
    'estados', (select count(distinct uf) from public.leads)
  );
$$;

revoke all on function public.estatisticas_fila() from public;
grant execute on function public.estatisticas_fila() to anon;

-- Migração 2026-10-28: área de atuação na lista VIP
alter table public.leads
  add column if not exists profissao text check (profissao is null or char_length(profissao) between 2 and 80);
grant insert (profissao) on public.leads to anon;

-- Migração 2026-10-28: site do negócio (opcional)
alter table public.leads
  add column if not exists site text check (site is null or char_length(site) between 4 and 200);
grant insert (site) on public.leads to anon;

-- Migração 2026-10-28: totais por estado para o mapa (somente contagens)
create or replace function public.contagem_por_uf()
returns json language sql security definer set search_path = public stable as $$
  select coalesce(json_agg(json_build_object('uf', uf, 'total', total) order by total desc), '[]'::json)
  from (select uf, count(*)::int as total from public.leads group by uf) t;
$$;
revoke all on function public.contagem_por_uf() from public, anon, authenticated;
grant execute on function public.contagem_por_uf() to anon;

-- Migração 2026-10-28: meta de arrecadação editável no Supabase (site só lê)
create table if not exists public.meta_arrecadacao (
  id int primary key default 1 check (id = 1),
  arrecadado numeric(10,2) not null default 0 check (arrecadado >= 0),
  total numeric(10,2) not null check (total > 0),
  atualizado_em timestamptz not null default now()
);
insert into public.meta_arrecadacao (id, arrecadado, total) values (1, 240, 600) on conflict (id) do nothing;
create or replace function public.meta_tocar_data() returns trigger language plpgsql set search_path = public as $$
begin new.atualizado_em := now(); return new; end; $$;
create trigger meta_atualizado_em before update on public.meta_arrecadacao for each row execute function public.meta_tocar_data();
revoke execute on function public.meta_tocar_data() from public, anon, authenticated;
alter table public.meta_arrecadacao enable row level security;
create policy "site pode ler a meta" on public.meta_arrecadacao for select to anon using (true);
revoke all on public.meta_arrecadacao from anon, authenticated;
grant select (arrecadado, total, atualizado_em) on public.meta_arrecadacao to anon;

-- Migração 2026-10-28: consumidores interessados (avisar quando a busca abrir)
create table if not exists public.clientes_interessados (
  id bigint generated always as identity primary key,
  nome text check (nome is null or char_length(nome) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,11}$'),
  uf char(2) not null check (uf ~ '^[A-Z]{2}$'),
  cidade text check (cidade is null or char_length(cidade) between 2 and 80),
  procura text check (procura is null or char_length(procura) <= 120),
  consentimento boolean not null check (consentimento = true),
  origem text check (char_length(origem) <= 200),
  criado_em timestamptz not null default now()
);
create unique index if not exists clientes_whatsapp_unico on public.clientes_interessados (whatsapp);
alter table public.clientes_interessados enable row level security;
create policy "site pode inserir cliente" on public.clientes_interessados for insert to anon with check (consentimento = true);
revoke all on public.clientes_interessados from anon, authenticated;
grant insert (nome, whatsapp, uf, cidade, procura, consentimento, origem) on public.clientes_interessados to anon;

-- Migração 2026-10-29: versão do texto de consentimento (art. 11 a partir da v2)
alter table public.leads add column if not exists consentimento_versao text check (consentimento_versao is null or char_length(consentimento_versao) <= 40);
alter table public.clientes_interessados add column if not exists consentimento_versao text check (consentimento_versao is null or char_length(consentimento_versao) <= 40);
grant insert (consentimento_versao) on public.leads to anon;
grant insert (consentimento_versao) on public.clientes_interessados to anon;

-- Migração 2026-10-29: diretório (anuncios). Ver migração "anuncios_diretorio" no Supabase.
-- Resumo: tabela public.anuncios com colunas públicas (slug, tipo, nome, profissao, descricao, uf,
-- cidade, whatsapp, instagram, site, logo_url, status, destaque, criado_em) e privadas (email, cnpj,
-- razao_social, cnpj_situacao, consentimento, consentimento_versao, origem).
-- Gatilho força status 'em_verificacao' e destaque=false em inserções do site, remove números de CNPJ
-- do início do nome (MEI) e gera o slug. RLS: anon só insere e lê linhas visíveis; grants por coluna
-- impedem ler dados privados. View public.anuncios_publicos (security_invoker).
-- Storage: bucket público "logos" (300 KB, webp/png/jpeg); anon só envia para a pasta anuncios/.
-- Moderação: no Table Editor, mude status para 'verificado' (selo) ou 'oculto' (sai do site);
-- destaque=true marca o anúncio em destaque.

-- Migração 2026-10-29: função publicar_anuncio(p jsonb) -> slug (security invoker; anon pode executar).
-- Motivo: inserir pela API com "return=representation" exige ler todas as colunas, inclusive as privadas.

-- Migração 2026-10-29: contagem_por_uf() e estatisticas_fila() passam a contar os anúncios visíveis
-- (status em_verificacao ou verificado); estatisticas_fila() também devolve "cidades".

-- 2026-10-29: contadores passam a rodar como SECURITY INVOKER (só leem colunas públicas, respeitando a RLS)
alter function public.contagem_por_uf() security invoker;
alter function public.estatisticas_fila() security invoker;

-- 2026-10-29: imagem de prévia (1200x630) gerada no navegador ao publicar
alter table public.anuncios add column if not exists imagem_url text;
alter table public.anuncios add constraint anuncios_imagem_url_check check (
  imagem_url is null or (char_length(imagem_url) <= 300 and imagem_url like 'https://jmvdgwtvyubwmhfyqras.supabase.co/storage/v1/object/public/logos/anuncios/%'));
alter table public.anuncios add constraint anuncios_logo_url_origem_check check (
  logo_url is null or logo_url like 'https://jmvdgwtvyubwmhfyqras.supabase.co/storage/v1/object/public/logos/anuncios/%');
grant insert (imagem_url), select (imagem_url) on public.anuncios to anon;
-- anuncios_publicos passou a incluir imagem_url; publicar_anuncio passou a gravar p->>'imagem_url'
