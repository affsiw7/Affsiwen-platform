begin;
create table if not exists affsiwen.intake (
 token_hash text primary key, revision integer not null default 0, document jsonb not null,
 expires timestamptz not null default now()+interval '1 day'
);
alter table affsiwen.intake enable row level security;
revoke all on affsiwen.intake from public,anon,authenticated;
create index if not exists affsiwen_intake_expiry on affsiwen.intake(expires);
-- A 256-bit random capability identifies an anonymous demo conversation. No user or order privileges.
create or replace function affsiwen.intake_access(capability text,document jsonb default null,expected_revision integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h text; item affsiwen.intake;
begin
 if capability is null or capability !~ '^[a-f0-9]{64}$' then raise sqlstate 'PT400' using message='Некорректная сессия диалога.'; end if;
 h:=encode(sha256(convert_to(capability,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(h,2));
 select * into item from affsiwen.intake where token_hash=h and expires>now();
 if document is null then return jsonb_build_object('revision',coalesce(item.revision,0),'document',item.document); end if;
 if coalesce(item.revision,0)<>expected_revision then raise sqlstate 'PT409' using message='Диалог обновился. Повторите запрос.'; end if;
 if octet_length(document::text)>50000 or jsonb_typeof(document->'messages') is distinct from 'array' or jsonb_array_length(document->'messages')>24 then raise sqlstate 'PT400' using message='Превышен объём диалога.'; end if;
 if item.token_hash is null then
  perform pg_advisory_xact_lock(7012026);
  if (select count(*) from affsiwen.intake where expires>now())>=1000 then raise sqlstate 'PT429' using message='Лимит демодиалогов исчерпан. Используйте каталог.'; end if;
 end if;
 delete from affsiwen.intake where expires<now();
 insert into affsiwen.intake(token_hash,revision,document) values(h,expected_revision+1,document)
 on conflict(token_hash) do update set revision=excluded.revision,document=excluded.document,expires=now()+interval '1 day';
 return jsonb_build_object('revision',expected_revision+1,'document',document);
end $$;
revoke all on function affsiwen.intake_access(text,jsonb,integer) from public,anon,authenticated;
grant execute on function affsiwen.intake_access(text,jsonb,integer) to anon,authenticated;
create or replace function public.affsiwen_intake(capability text,document jsonb default null,expected_revision integer default 0) returns jsonb
language sql security invoker set search_path='' as $$ select affsiwen.intake_access(capability,document,expected_revision); $$;
revoke all on function public.affsiwen_intake(text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.affsiwen_intake(text,jsonb,integer) to anon,authenticated;
commit;
