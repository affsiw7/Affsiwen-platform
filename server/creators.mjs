import {HttpError} from './errors.mjs';
import {socialAdapter} from './social.mjs';
import {commerceProduct,productLinkAllowed} from '../dist/commerce-catalog.js';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
// Read-only AFF7 configuration and output dictionaries, 2026-10-06.
const sources={tiktok:{id:'gd_lu702nij2f790tmv9h',name:'TikTok',keyword:'search_keyword'},youtube:{id:'gd_lk56epmy2i5g7lzu0k',name:'YouTube',keyword:'keyword'}};
const columns=['Автор','Площадка','Профиль','Instagram из биографии','Пример контента','Просмотры примера','Основание включения'];
const bounded=(value,max=120)=>{if(value===undefined||value===null||typeof value==='object')return '—';let s=String(value).replace(/[\u0000-\u001f]/g,' ');while(Buffer.byteLength(s)>max)s=s.slice(0,-1);return s||'—';};
function profileUrl(value,id){
 if(typeof value!=='string'||value.length>180||!productLinkAllowed(value,commerceProduct(id)))return null;
 const u=new URL(value);const ok=id==='tiktok'?/^\/@[^/]+\/?$/.test(u.pathname):id==='instagram'?/^\/(?!(?:p|reel|reels|explore|accounts)(?:\/|$))[A-Za-z0-9_.]+\/?$/.test(u.pathname):/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/?$/.test(u.pathname);
 if(!ok)return null;u.search='';u.hash='';return u.href.replace(/\/$/,'');
}
function contentUrl(value,id){if(typeof value!=='string'||value.length>180||!productLinkAllowed(value,commerceProduct(id)))return null;const u=new URL(value);if(id==='tiktok'?!/^\/@[^/]*\/video\/\d+\/?$/.test(u.pathname):!(u.pathname==='/watch'&&u.searchParams.get('v')||/^\/shorts\/[^/]+\/?$/.test(u.pathname)))return null;u.hash='';return u.href;}
export function normalizeCreatorSource(raw,id,limit){
 check(Array.isArray(raw),'Не удалось прочитать найденный контент.');const s=sources[id];check(s,'Площадка не поддерживается.');
 const good=raw.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!r.error&&!r.error_code);
 const rows=good.slice(0,limit).map(r=>{
  const example=contentUrl(r.url,id);if(!example)return null;
  const profile=profileUrl(id==='tiktok'?r.profile_url:r.channel_url_decoded||r.channel_url,id);
  // Never derive account identity from a similar name or a promotional video link.
  const bio=id==='tiktok'&&typeof r.profile_biography==='string'?r.profile_biography:'';
  const instagram=(bio.match(/https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?/g)||[]).map(v=>profileUrl(v,'instagram')).find(Boolean)||'—';
  return {'Автор':bounded(id==='tiktok'?r.profile_username:r.youtuber),'Площадка':s.name,'Профиль':profile||'—','Instagram из биографии':instagram,'Пример контента':example,'Просмотры примера':bounded(id==='tiktok'?r.play_count:r.views,24),'Основание включения':'Найден в поисковой выдаче; соответствие брифу требует проверки.'};
 }).filter(Boolean);
 return {mode:'live',synthetic:false,rows,received:raw.length,errorRecords:raw.length-good.length,dataSource:s.name};
}
export function mergeCreatorResults(parts,plan){
 const grouped=new Map(),queues=[];
 for(const part of parts){const queue=[];for(const r of part.rows||[]){if(r['Профиль']==='—')continue;const key=r['Площадка']+':'+r['Профиль'];if(grouped.has(key))continue;grouped.set(key,r);queue.push(r);}queues.push(queue);}
 // Interleave networks; view counts are not a comparable cross-network ranking.
 const rows=[];for(let i=0;rows.length<plan.limit&&queues.some(q=>i<q.length);i++)for(const q of queues)if(q[i]&&rows.length<plan.limit)rows.push(q[i]);
 return {mode:'live',synthetic:false,product:'creators',title:plan.title,rows,requested:plan.limit,received:parts.reduce((n,p)=>n+(p.received||0),0),errorRecords:parts.reduce((n,p)=>n+(p.errorRecords||0),0),sourceCounts:parts.map(p=>({source:p.dataSource,contentRows:p.rows?.length||0})),notice:'Кандидаты из ограниченной поисковой выдачи. Дубли удалены только внутри одной площадки по точной ссылке профиля. Между соцсетями аккаунты не объединены по имени. Instagram — ссылка из публичной биографии TikTok, если она получена; владение аккаунтом и его показатели не проверены. Просмотры относятся к одному примеру контента, не к среднему охвату. Соответствие брифу и демография аудитории не подтверждены.'};
}
export function creatorsRunConfiguration(env){return {enabled:env.AFFSIWEN_CREATORS_RUN_ENABLED==='yes'&&env.AFFSIWEN_AMAZON_RUN_ENABLED==='yes'&&!!env.BRIGHT_DATA_API_KEY,maxRecords:10,maxRunsPerDay:Math.min(3,Math.max(0,Number(env.AFFSIWEN_AMAZON_RUNS_PER_DAY)||0)),sourceCalls:2,maxContentRecords:20};}
export function creatorsAdapter(){
 const product=commerceProduct('creators');
 async function inventory(options){const results=await Promise.all(Object.keys(sources).map(async id=>({id,result:await socialAdapter(id).inventory(options)})));const rows=results.flatMap(({id,result})=>result.inventory.filter(r=>r.id===sources[id].id).map(r=>({...r,platform:id})));const connected=Object.keys(sources).every(id=>rows.some(r=>r.platform===id&&r.scrapers?.discover_by_keyword));return {connected,reason:connected?'verified':'incomplete_search_access',inventory:rows};}
 const tasks=[{id:'search',title:'Кандидаты для кампании',description:'Один бриф, поиск тематического контента TikTok и YouTube, ссылки на авторов и примеры.'}];
 const available=inv=>inv.connected?tasks:[];
 function prepare(data,inv){
  check(data?.task==='search','Выберите подбор авторов.');check(inv.connected,'Поиск одной из площадок сейчас недоступен.');
  const value=String(data.value||'').trim(),request=String(data.request||'').trim(),limit=Number(data.limit),brief=data.brief;
  check(value.length>=2&&value.length<=160&&request.length>=2&&request.length<=1000,'Нужны поисковая фраза и цель кампании.');
  check(!data.market||data.market==='GLOBAL','Страну уточним в брифе.');check(Number.isInteger(limit)&&limit>=1&&limit<=10,'Для первого подбора: от 1 до 10 кандидатов.');
  check(brief&&typeof brief==='object'&&!Array.isArray(brief)&&brief.confirmed===true,'Сначала согласуйте бриф и объём подбора.');
  const clean={product:String(brief.product||'').trim(),language:String(brief.language||'').trim(),country:String(brief.country||'').trim(),criteria:String(brief.criteria||'').trim(),confirmed:true};
  check(clean.product.length>=2&&clean.product.length<=200&&clean.language.length<=80&&clean.criteria.length<=300,'Опишите продукт и критерии подбора.');
  check(['','US','GB','DE','FR','ES','IT','CA','AU'].includes(clean.country),'Для страны выберите поддерживаемый код или оставьте поле пустым.');
  const sourceLimit=Math.min(10,limit*2),contracts=Object.entries(sources).map(([id,s])=>{
   const row=inv.inventory.find(r=>r.platform===id),schema=row?.scrapers?.discover_by_keyword?.input_schema;check(Array.isArray(schema)&&schema.length,'Параметры поиска ещё проверяются.');
   const supplied={[s.keyword]:value,num_of_posts:sourceLimit,country:clean.country,start_date:'',end_date:'',include_shorts:true},input={};
   for(const f of schema){if(typeof f.name!=='string')continue;if(Object.hasOwn(supplied,f.name))input[f.name]=supplied[f.name];else check(f.required!==true,'Нужно уточнить дополнительный параметр поиска.');}
   check(input[s.keyword],'Поисковая фраза не поддержана источником.');
   return {platform:id,query:{dataset_id:s.id,include_errors:'true',notify:'false',type:'discover_new',discover_by:'keyword'},body:{input:[input],limit_per_input:sourceLimit}};
  });
  return {display:{product:'creators',task:'search',title:'Кандидаты для вашей кампании',market:'GLOBAL',value,request,limit,brief:clean,columns,mode:'prepared',priceStatus:'not_approved',dataSource:'TikTok + YouTube · Instagram по публичной связи',sourceSteps:contracts.map(c=>({source:sources[c.platform].name,limit:sourceLimit})),maxContentRecords:sourceLimit*2,notice:'До '+limit+' кандидатов из максимум '+(sourceLimit*2)+' найденных видео. Поиск не гарантирует нужное число авторов. Страна задаёт регион поиска, не местонахождение подписчиков. Язык и критерии — бриф для последующей проверки, не гарантированные фильтры. Цена ещё рассчитывается.'},contract:{steps:contracts}};
 }
 function resolveChatAnswer(answer,messages=[],prior={}){
  if(!answer||!['ready','clarify'].includes(answer.status))return answer;
  const confirmation=(messages.filter(m=>m.role==='user').at(-1)?.content||'').trim();
  const confirmed=/^(?:да(?:,? (?:согласен с брифом|вс[её] верно(?: — подтверждаю)?|подтверждаю))?|согласен(?: с брифом)?|подтверждаю(?: бриф)?|вс[её] верно|yes|confirm)[.!]?$/iu.test(confirmation);
  const agreed=prior.brief&&prior.value&&Number.isInteger(prior.limit);
  if(confirmed&&agreed)return {...answer,status:'ready',task:'search',value:prior.value,limit:prior.limit,market:'GLOBAL',brief:{...prior.brief,confirmed:true},goal:prior.goal||answer.goal};
  const complete=answer.task==='search'&&typeof answer.value==='string'&&answer.value.trim().length>=2&&Number.isInteger(answer.limit)&&answer.limit>=1&&answer.limit<=10&&answer.brief?.product?.length>=2&&answer.brief?.language?.length>=2&&answer.brief?.criteria?.length>=2;
  if(answer.status==='clarify'&&!complete)return answer;
  const b=answer.brief;
  return {...answer,brief:b?{...b,confirmed:false}:null,status:'clarify',message:'Согласуем бриф: '+String(b?.product||'ваш продукт')+'. Тема поиска: '+String(answer.value||'нужно уточнить')+'. Язык: '+String(b?.language||'уточним')+'. Регион поиска: '+String(b?.country||'не задан')+'. Критерии: '+String(b?.criteria||'уточним')+'. До '+String(answer.limit||'уточним число')+' кандидатов. В подбор входят TikTok и YouTube; Instagram — только публичная ссылка из биографии. Язык и соответствие критериям проверяются после поиска. Подтвердите бриф или внесите изменения.',options:['Да, согласен с брифом','Хочу изменить критерии']};
 }
 const briefSchema={type:'object',additionalProperties:false,required:['product','language','country','criteria','confirmed'],properties:{product:{type:'string'},language:{type:'string'},country:{type:'string',enum:['','US','GB','DE','FR','ES','IT','CA','AU']},criteria:{type:'string'},confirmed:{type:'boolean'}}};
 return {id:'creators',product,tasks,inventory,available,prepare,resolveChatAnswer,markets:['GLOBAL'],acceptsUrl:()=>false,runConfiguration:creatorsRunConfiguration,chatFields:{brief:{anyOf:[briefSchema,{type:'null'}]}},chatInstructions:'Это единый подбор авторов для кампании. task=search, market=GLOBAL, value — одна короткая поисковая фраза для TikTok и YouTube. Уточни продукт, язык, критерии и до 10 кандидатов. brief содержит product, language, country, criteria, confirmed. country — регион поиска, не страна аудитории; можно оставить пустым. Язык и бизнес-критерии требуют проверки контента, не обещай строгий фильтр. Перед ready покажи параметры словами и дождись явного согласия отдельным сообщением. До согласия brief.confirmed=false; после согласия true. Сохраняй бриф между сообщениями. Используй фото для уточнения продукта, не угадывай бренд. В предложение входят два ограниченных поиска, примеры видео и ссылки на авторов. Instagram показывается только при явной ссылке из публичной биографии TikTok; его данные ещё не обогащаются. Не обещай проверки владения аккаунтом, аудитории, накрутки, доходов, результатов рекламы, нужного количества авторов или полного охвата. Подбор даёт кандидатов из выдачи; смысловое соответствие ещё требует оценки. Не суммируй просмотры/подписчиков площадок. Комбинация этих двух поисков подключена; не отправляй клиента выбирать отдельную соцсеть.',publicConnection:inv=>({connected:inv.connected,reason:inv.reason,product:product.name,category:'Social Media',dataSource:product.dataSource,checkedAt:new Date().toISOString(),tasks:tasks.map(t=>({...t,available:inv.connected})),sources:Object.entries(sources).map(([id,s])=>({name:s.name,available:inv.inventory.some(r=>r.platform===id&&r.scrapers?.discover_by_keyword)})),instagram:{mode:'public_link_only',enrichment:false}}),childAdapter:(id,inv)=>({id:'creators-'+id,product:{name:sources[id].name},inventory:async()=>inv,prepare:plan=>{const p=prepare({...plan,task:'search',limit:plan.candidateLimit},inv),c=p.contract.steps.find(c=>c.platform===id);return {display:{...plan,title:'Поиск контента '+sources[id].name},contract:c};},normalize:(raw,plan)=>normalizeCreatorSource(raw,id,plan.limit)})};
}
