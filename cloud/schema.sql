-- Affsiwen demo marketplace. Apply only in the dedicated Affsiwen Supabase project.
-- No service key, provider credentials, real charges or external execution.
begin;
create schema if not exists affsiwen;
revoke all on schema affsiwen from public;
create table if not exists affsiwen.profiles (
 id uuid primary key references auth.users(id), role text not null check(role in ('buyer','supplier','operator'))
);
create table if not exists affsiwen.products (
 id text primary key, owner_id uuid references auth.users(id), status text not null check(status in ('candidate','published','paused','rejected')),
 version integer not null default 1, document jsonb not null, private_document jsonb not null default '{}'
);
create table if not exists affsiwen.orders (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id), request_key text not null,
 fingerprint jsonb not null, document jsonb not null, created timestamptz not null default now(), unique(buyer_id,request_key)
);
create table if not exists affsiwen.events (
 id bigint generated always as identity primary key, order_id uuid not null references affsiwen.orders(id), event text not null, created timestamptz not null default now()
);
create table if not exists affsiwen.messages (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references affsiwen.orders(id), author_id uuid not null references auth.users(id),
 role text not null, body text not null check(length(body) between 1 and 4000), created timestamptz not null default now()
);
create table if not exists affsiwen.favorites (
 user_id uuid not null references auth.users(id), product_id text not null references affsiwen.products(id), primary key(user_id,product_id)
);
create index if not exists affsiwen_orders_buyer_created on affsiwen.orders(buyer_id,created desc);
create index if not exists affsiwen_events_order on affsiwen.events(order_id,id);
create index if not exists affsiwen_messages_order on affsiwen.messages(order_id,created);
alter table affsiwen.profiles enable row level security;
alter table affsiwen.products enable row level security;
alter table affsiwen.orders enable row level security;
alter table affsiwen.events enable row level security;
alter table affsiwen.messages enable row level security;
alter table affsiwen.favorites enable row level security;
-- No direct table privileges. The guarded transaction boundary below is the only write API.
revoke all on all tables in schema affsiwen from public,anon,authenticated;

create or replace function affsiwen.market(action text, args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); user_role text; p affsiwen.products; o affsiwen.orders;
 doc jsonb; result jsonb; input jsonb; fingerprint jsonb; n integer; k text; oid uuid; event_name text;
begin
 if octet_length(args::text)>65536 then raise sqlstate 'PT413' using message='Слишком большой запрос.'; end if;
 -- Only the published customer projection is available before authentication.
 if action='catalog' and uid is null then
  return jsonb_build_object('products',coalesce((select jsonb_agg(document order by id) from affsiwen.products where status='published'),'[]'::jsonb));
 end if;
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise sqlstate 'PT401' using message='Войдите в аккаунт.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if action='profile.setup' then
  if coalesce(args->>'role','buyer') not in ('buyer','supplier') then raise sqlstate 'PT403' using message='Эту роль нельзя зарегистрировать.'; end if;
  insert into affsiwen.profiles(id,role) values(uid,coalesce(args->>'role','buyer')) on conflict(id) do nothing;
 end if;
 select role into user_role from affsiwen.profiles where id=uid;
 if user_role is null then raise sqlstate 'PT409' using message='Завершите настройку аккаунта.'; end if;
 if action in ('profile.setup','me') then return jsonb_build_object('user',jsonb_build_object('id',uid,'role',user_role,'email',(select email from auth.users where id=uid))); end if;
 if action='catalog' then
  return jsonb_build_object('products',coalesce((select jsonb_agg(document || case when owner_id=uid or user_role='operator' then jsonb_build_object('ownerId',owner_id,'submission',private_document->'submission','reviewNote',private_document->>'reviewNote') else '{}'::jsonb end order by id) from affsiwen.products where status='published' or owner_id=uid or user_role='operator'),'[]'::jsonb));
 end if;
 if action='propose' then
  if user_role not in ('supplier','operator') then raise sqlstate 'PT403' using message='Нужен аккаунт партнёра.'; end if;
  if coalesce(args->>'actor','') !~ '^[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9_-]{1,100}$' or length(trim(coalesce(args->>'title','')))<3 then raise sqlstate 'PT400' using message='Проверьте название и идентификатор Agent.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(args->>'actor',1));
  if exists(select 1 from affsiwen.products where private_document->>'actor'=args->>'actor') then raise sqlstate 'PT409' using message='Этот Agent уже в отборе.'; end if;
  if args ? 'submission' then
   foreach k in array array['audience','inputExample','outputFields','limitations'] loop
    if coalesce(length(trim(args->'submission'->>k)),0) not between 3 and 1000 then raise sqlstate 'PT400' using message='Заполните описание результата и ограничения.'; end if;
   end loop;
  end if;
  k:=gen_random_uuid()::text;
  doc:=jsonb_build_object('id',k,'title',left(args->>'title',120),'description',left(coalesce(args->>'description',''),1000),'category',left(coalesce(args->>'category','Исследования'),60),'example','Тема исследования','kind','social','version',1,'status','candidate','priceCents',1900,'priceStatus','scenario','maxItems',100,'delivery','Таблица + CSV + JSON','url','/market.html#product/'||k,'readiness',jsonb_build_object('ready',false),'assessment',jsonb_build_object('rank',0,'label','Недостаточно данных','basis','Предварительная редакционная оценка Affsiwen.','verifiedQuality',false),'positioning',jsonb_build_object('summary',args->>'description','audience',args->'submission'->>'audience','inputHint',args->'submission'->>'inputExample','deliverable',args->'submission'->>'outputFields','nextStep','Проверьте результат перед использованием.','limitations',args->'submission'->>'limitations'));
  insert into affsiwen.products(id,owner_id,status,document,private_document) values(k,uid,'candidate',doc,jsonb_build_object('actor',args->>'actor','submission',args->'submission'));
  return jsonb_build_object('product',doc);
 end if;
 if action='revise' then
  if user_role<>'operator' then raise sqlstate 'PT403' using message='Нужен оператор.'; end if;
  select * into p from affsiwen.products where id=args->>'id' for update;
  if p.id is null then raise sqlstate 'PT404' using message='Продукт не найден.'; end if;
  if p.version<>(args->>'version')::integer or args->>'version' is null then raise sqlstate 'PT409' using message='Версия изменилась. Обновите страницу.'; end if;
  if coalesce(args->>'status',p.status) not in ('candidate','published','paused','rejected') then raise sqlstate 'PT400' using message='Неверный статус.'; end if;
  n:=coalesce((args->>'priceCents')::integer,(p.document->>'priceCents')::integer);
  if n not between 100 and 100000 then raise sqlstate 'PT400' using message='Цена: от 1 до 1000 евро.'; end if;
  doc:=p.document||jsonb_build_object('version',p.version+1,'status',coalesce(args->>'status',p.status),'priceCents',n,'priceStatus','scenario');
  update affsiwen.products set document=doc,version=p.version+1,status=doc->>'status',private_document=private_document||jsonb_build_object('reviewNote',left(coalesce(args->>'reviewNote',''),2000)) where id=p.id;
  return jsonb_build_object('product',doc);
 end if;
 if action in ('favorites','favorite') then
  if action='favorite' then
   if not exists(select 1 from affsiwen.products where id=args->>'id' and status='published') then raise sqlstate 'PT404' using message='Продукт не найден.'; end if;
   delete from affsiwen.favorites where user_id=uid and product_id=args->>'id';
   if not found then insert into affsiwen.favorites values(uid,args->>'id'); end if;
  end if;
  return jsonb_build_object('ids',coalesce((select jsonb_agg(product_id) from affsiwen.favorites where user_id=uid),'[]'::jsonb));
 end if;
 if action='orders' then return jsonb_build_object('orders',coalesce((select jsonb_agg(document order by created desc) from affsiwen.orders where buyer_id=uid or user_role='operator'),'[]'::jsonb)); end if;
 if action='create' then
  if user_role<>'buyer' then raise sqlstate 'PT403' using message='Заказы оформляет покупатель.'; end if;
  if coalesce(args->>'key','') !~ '^[a-zA-Z0-9_-]{8,100}$' then raise sqlstate 'PT400' using message='Нужен ключ повторной отправки.'; end if;
  input:=args->'input';
  if jsonb_typeof(input)<>'object' or coalesce(length(trim(input->>'query')),0) not between 2 and 2000 or coalesce(input->>'country','') !~ '^(Worldwide|[A-Z]{2})$' or coalesce(input->>'limit','') !~ '^[0-9]{1,6}$' then raise sqlstate 'PT400' using message='Проверьте задачу, страну и лимит.'; end if;
  input:=jsonb_build_object('query',trim(input->>'query'),'country',input->>'country','limit',(input->>'limit')::integer);
  fingerprint:=jsonb_build_object('productId',args->>'productId','input',input);
  select * into o from affsiwen.orders where buyer_id=uid and request_key=args->>'key';
  if o.id is not null then
   if o.fingerprint<>fingerprint then raise sqlstate 'PT409' using message='Ключ использован для другого заказа.'; end if;
   return jsonb_build_object('order',o.document);
  end if;
  select * into p from affsiwen.products where id=args->>'productId' and status='published' for share;
  if p.id is null then raise sqlstate 'PT409' using message='Продукт недоступен.'; end if;
  n:=(input->>'limit')::integer;
  if n<1 or n>(p.document->>'maxItems')::integer then raise sqlstate 'PT400' using message='Превышен лимит продукта.'; end if;
  oid:=gen_random_uuid();
  doc:=jsonb_build_object('id',oid,'buyerId',uid,'productId',p.id,'product',p.document,'input',input,'amountCents',p.document->'priceCents','priceStatus','scenario','currency','eur','status','awaiting_payment','paymentMode','fixture','providerMode',null,'created',now(),'result',null,'error',null);
  insert into affsiwen.orders(id,buyer_id,request_key,fingerprint,document) values(oid,uid,args->>'key',fingerprint,doc);
  insert into affsiwen.events(order_id,event) values(oid,'order.created');
  return jsonb_build_object('order',doc);
 end if;
 if action='operations' then
  if user_role<>'operator' then raise sqlstate 'PT403' using message='Нужен оператор.'; end if;
  select jsonb_build_object('orders',count(*),'needsReview',count(*) filter(where document->>'status'='review'),'queued',0,'commercialRevenueCents',0,'testVolumeCents',coalesce(sum((document->>'amountCents')::integer) filter(where document->>'status' in ('delivered','accepted','review')),0),'costUnknown',count(*) filter(where document->>'status' in ('delivered','accepted','review'))) into result from affsiwen.orders;
  return result||jsonb_build_object('products',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'title',pr.document->>'title','orders',(select count(*) from affsiwen.orders where document->>'productId'=pr.id),'delivered',(select count(*) from affsiwen.orders where document->>'productId'=pr.id and document->>'status' in ('delivered','accepted')),'testPaid',(select count(*) from affsiwen.orders where document->>'productId'=pr.id and document->>'status' in ('delivered','accepted','review','refunded')),'commercialPaid',0,'repeatBuyers',(select count(*) from (select buyer_id from affsiwen.orders where document->>'productId'=pr.id and document->>'status' in ('delivered','accepted','review') group by buyer_id having count(*)>1) t))) from affsiwen.products pr),'[]'::jsonb));
 end if;
 if action not in ('read','events','messages','message','pay-test','accept','cancel','dispute','refund-test') then raise sqlstate 'PT404' using message='Действие не подключено.'; end if;
 select * into o from affsiwen.orders where id=(args->>'id')::uuid and (buyer_id=uid or user_role='operator') for update;
 if o.id is null then raise sqlstate 'PT404' using message='Заказ не найден.'; end if;
 if action='read' then return jsonb_build_object('order',o.document); end if;
 if action='events' then return jsonb_build_object('events',coalesce((select jsonb_agg(jsonb_build_object('event',event,'created',created) order by id) from affsiwen.events where order_id=o.id),'[]'::jsonb)); end if;
 if action in ('messages','message') then
  if action='message' then
   if coalesce(length(trim(args->>'body')),0) not between 1 and 4000 then raise sqlstate 'PT400' using message='Сообщение: от 1 до 4000 символов.'; end if;
   insert into affsiwen.messages(order_id,author_id,role,body) values(o.id,uid,user_role,trim(args->>'body'));
  end if;
  return jsonb_build_object('messages',coalesce((select jsonb_agg(jsonb_build_object('id',id,'role',role,'body',body,'created',created) order by created,id) from affsiwen.messages where order_id=o.id),'[]'::jsonb));
 end if;
 doc:=o.document;
 if action='refund-test' then
  if user_role<>'operator' then raise sqlstate 'PT403' using message='Нужен оператор.'; end if;
  if doc->>'status'='refunded' then return jsonb_build_object('order',doc); end if;
  if doc->>'status' not in ('delivered','accepted','review') then raise sqlstate 'PT409' using message='Возврат пока недоступен.'; end if;
  doc:=doc||jsonb_build_object('status','refunded');event_name:='refund.fixture_confirmed';
 else
  if o.buyer_id<>uid then raise sqlstate 'PT403' using message='Действие доступно владельцу заказа.'; end if;
  if action='pay-test' then
   -- Atomic synthetic execution. No background timer or paid provider request.
   if exists(select 1 from affsiwen.events where order_id=o.id and event='payment.fixture_confirmed') then return jsonb_build_object('order',doc); end if;
   if doc->>'status'<>'awaiting_payment' then raise sqlstate 'PT409' using message='Оплата недоступна.'; end if;
   select jsonb_agg(jsonb_build_object('id','demo-'||g,'title',left(doc->'input'->>'query',70)||' · пример '||g,'url','https://example.com/result/'||g,'synthetic',true,'text','Демонстрационная строка. Реальный сбор не запускался.')) into result from generate_series(1,least((doc->'input'->>'limit')::integer,12)) g;
   doc:=doc||jsonb_build_object('status','delivered','providerMode','fixture','result',result,'finished',now(),'quality',jsonb_build_object('complete',true,'synthetic',true,'rows',jsonb_array_length(result),'requested',doc->'input'->'limit'));
   insert into affsiwen.events(order_id,event) values(o.id,'payment.fixture_confirmed');event_name:='result.delivered';
  elsif action='accept' then
   if doc->>'status'='accepted' then return jsonb_build_object('order',doc); end if;
   if doc->>'status'<>'delivered' then raise sqlstate 'PT409' using message='Результат ещё не готов.'; end if;
   doc:=doc||jsonb_build_object('status','accepted');event_name:='buyer.accepted';
  elsif action='cancel' then
   if doc->>'status'<>'awaiting_payment' then raise sqlstate 'PT409' using message='Отмена недоступна.'; end if;
   doc:=doc||jsonb_build_object('status','cancelled');event_name:='order.cancelled';
  elsif action='dispute' then
   if doc->>'status' not in ('delivered','accepted') or coalesce(length(trim(args->>'reason')),0) not between 5 and 2000 then raise sqlstate 'PT409' using message='Укажите причину проверки выданного результата.'; end if;
   doc:=doc||jsonb_build_object('status','review','error','Покупатель запросил проверку результата.');event_name:='buyer.disputed';
   insert into affsiwen.messages(order_id,author_id,role,body) values(o.id,uid,user_role,trim(args->>'reason'));
  end if;
 end if;
 update affsiwen.orders set document=doc where id=o.id;
 insert into affsiwen.events(order_id,event) values(o.id,event_name);
 return jsonb_build_object('order',doc);
end $$;
revoke all on function affsiwen.market(text,jsonb) from public,anon,authenticated;
grant usage on schema affsiwen to anon,authenticated;
grant execute on function affsiwen.market(text,jsonb) to anon,authenticated;
create or replace function public.affsiwen_market(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select affsiwen.market(action,args); $$;
revoke all on function public.affsiwen_market(text,jsonb) from public,anon,authenticated;
grant execute on function public.affsiwen_market(text,jsonb) to anon,authenticated;
commit;
