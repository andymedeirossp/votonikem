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
