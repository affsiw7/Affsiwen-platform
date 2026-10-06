import {HttpError} from './errors.mjs';
import {socialProducts,aiProducts,productLinkAllowed} from '../dist/commerce-catalog.js';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
// Inspected collect-by-URL/source prompt contracts in AFF7, 2026-10-06.
const definitions={
 linkedin:{domain:'linkedin.com',families:{profile:'gd_l1viktl72bvl7bjuj0',company:'gd_l1vikfnt1wgvvqz95w'}},
 instagram:{domain:'instagram.com',families:{profile:'gd_l1vikfch901nx3by4',post:'gd_lk5ns7kz21pck8jpis'}},
 tiktok:{domain:'tiktok.com',families:{profile:'gd_l1villgoiiidt09ci',video:'gd_lu702nij2f790tmv9h'}},
 facebook:{domain:'facebook.com',families:{'page-posts':'gd_lkaxegm826bjpoo9m5'}},
 youtube:{domain:'youtube.com',families:{video:'gd_lk56epmy2i5g7lzu0k'}},
 x:{domain:'x.com',families:{post:'gd_lwxkxvnf1cynvib9co'}},
 reddit:{domain:'reddit.com',families:{post:'gd_lvz8ah06191smkebj4'}},
 pinterest:{domain:'pinterest.com',families:{pin:'gd_lk0sjs4d21kdr7cnlv'}},
 threads:{domain:'threads.com',families:{profile:'gd_mde7jg3ld2h3hnnf2'}},
 snapchat:{domain:'www.snapchat.com',families:{video:'gd_ma0ydx431w6stl16ge'}},
 quora:{domain:'quora.com',families:{answer:'gd_lvz1rbj81afv3m6n5y'}},
 vimeo:{domain:'vimeo.com',families:{video:'gd_lxk88z3v1ketji4pn'}},
 bluesky:{domain:'bsky.app',families:{post:'gd_m6hn4r5s27zfhc7w4'}},
 twitch:{domain:'twitch.tv',families:{channel:'gd_m5wbb7fp2ktz2483hl'}},
 bilibili:{domain:'bilibili.com',families:{video:'gd_mrhub1btbamw5fq1t'}},
 chatgpt:{domain:'chatgpt.com',families:{search:'gd_m7aof0k82r803d5bjm'}}
};
const labels={profile:'Публичный профиль',company:'Публичная компания',post:'Публикация',video:'Видео',pin:'Пин','page-posts':'Публикации страницы',answer:'Публичный ответ',channel:'Канал',search:'Ответ AI-поиска'};
const profileColumns=['Название','Автор','Описание','Подписчики','Ссылка'];
const postColumns=['Название','Автор','Текст','Просмотры','Реакции','Комментарии','Дата','Ссылка'];
const cache=new Map();
export function socialAdapter(id){
 const d=definitions[id],product=[...socialProducts,...aiProducts].find(p=>p.id===id);if(!d||!product)return null;
 const tasks=Object.keys(d.families).map(id=>({id,title:labels[id],description:id==='search'?'Самостоятельный вопрос веб-поиску, ответ и цитируемые источники.':labels[id]+' по публичной ссылке; доступные поля и показатели.'}));
 async function inventory({key,fetcher=fetch,now=Date.now()}={}){
  if(!key)return {connected:false,reason:'not_configured',inventory:[]};const hit=cache.get(id);if(hit?.key===key&&hit.fetcher===fetcher&&hit.until>now)return hit.value;
  let value;try{const r=await fetcher('https://api.brightdata.com/datasets/v3/scrapers?domain='+d.domain,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});const body=r.ok?await r.json():null;const rows=Array.isArray(body)?body.filter(r=>r&&Object.values(d.families).includes(r.id)&&r.scrapers):[];value={connected:rows.length>0,reason:rows.length?'verified':'unavailable',inventory:rows};}catch{value={connected:false,reason:'unavailable',inventory:[]};}cache.set(id,{key,fetcher,until:now+(value.connected?300000:15000),value});return value;
 }
 const available=inv=>tasks.filter(t=>inv.inventory?.some(r=>r.id===d.families[t.id]&&r.scrapers?.collect_by_url));
 function acceptsTaskUrl(value,task){
  if(!productLinkAllowed(value,product))return false;const u=new URL(value),path=u.pathname;
  if(id==='linkedin')return task==='company'?/^\/(company|organization-guest\/company)\/[^/]+\/?$/.test(path):/^\/in\/[^/]+\/?$/.test(path);
  if(id==='instagram')return task==='profile'?/^\/(?!p\/|reel\/|explore\/)[A-Za-z0-9_.]+\/?$/.test(path):/^\/p\/[^/]+\/?$/.test(path);
  if(id==='tiktok')return task==='profile'?/^\/@[^/]+\/?$/.test(path):/^\/@[^/]*\/video\/\d+\/?$/.test(path);
  if(id==='youtube')return path==='/watch'&&/^[\w-]+$/.test(u.searchParams.get('v')||'');
  if(id==='x')return /^\/[^/]+\/status\/\d+\/?$/.test(path);
  if(id==='reddit')return /^\/r\/[^/]+\/comments\//.test(path);
  if(id==='pinterest')return /^\/pin\/\d+\/?$/.test(path);
  if(id==='threads')return /^\/@[^/]+\/?$/.test(path);
  if(id==='snapchat')return /^\/spotlight\/[^/]+\/?$/.test(path);
  if(id==='quora')return /\/answer\/[^/]+\/?$/.test(path);
  if(id==='vimeo')return /^\/\d+\/?$/.test(path);
  if(id==='bluesky')return /^\/profile\/[^/]+\/post\/[^/]+\/?$/.test(path);
  if(id==='twitch')return /^\/(?!directory|videos|search)[^/]+\/?$/.test(path);
  if(id==='bilibili')return /^\/video\/[^/]+\/?$/.test(path);
  if(id==='facebook')return /^\/(?!groups\/|marketplace\/|login)[^/]+\/?$/.test(path);
  return false;
 }
 function prepare(data,inv){
  check(data&&typeof data==='object','Некорректный запрос.');const task=tasks.find(t=>t.id===data.task);check(task,'Этот тип данных ещё не подключён.');check(!data.market||data.market==='GLOBAL','Регион определяется конкретным запросом.');
  const value=String(data.value||'').trim(),request=String(data.request||'').trim(),limit=Number(data.limit);check(value.length>=2&&value.length<=2000&&request.length>=2&&request.length<=2000,'Укажите ссылку или вопрос и цель запроса.');check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Объём: от 1 до 100 записей.');if(id==='chatgpt')check(limit===1,'Один вопрос даёт один ответ; согласуйте одну запись.');
  if(!inv.connected)throw new HttpError(503,'Подключение данных временно недоступно.');const row=inv.inventory.find(r=>r.id===d.families[task.id]),contract=row?.scrapers?.collect_by_url;check(contract&&Array.isArray(contract.input_schema)&&contract.input_schema.length,'Эта операция сейчас недоступна.');
  let supplied;if(id==='chatgpt')supplied={url:'https://chatgpt.com/',prompt:value,web_search:true,require_sources:true,additional_prompt:''};else{check(acceptsTaskUrl(value,task.id),'Нужна публичная ссылка '+product.name+' на '+task.title.toLowerCase()+'.');const u=new URL(value);u.hash='';supplied={url:u.href,...(id==='facebook'?{num_of_posts:limit,posts_to_not_include:[],start_date:'',end_date:''}:{})};}
  const input={},missing=[];for(const f of contract.input_schema){if(typeof f.name!=='string')continue;const v=supplied[f.name];if(v!==undefined)input[f.name]=v;else if(f.required===true)missing.push(f.name);}check(!missing.length,'Нужно уточнить дополнительные параметры; запрос не отправлен.');check(input.url&&(id!=='chatgpt'||input.prompt),'Параметры операции требуют настройки.');
  const columns=id==='chatgpt'?['Запрос','Ответ','Источники','Ссылка']:['profile','company','channel'].includes(task.id)?profileColumns:postColumns;
  return {display:{product:id,task:task.id,title:task.title,market:'GLOBAL',dataSource:product.dataSource,limit,value,request,columns,mode:'prepared',priceStatus:'not_approved',notice:'Данные из '+product.dataSource+'. Поля и показатели доступны только в пределах конкретного ответа источника.'},contract:{query:{dataset_id:row.id,include_errors:'true',notify:'false'},body:{input:[input],limit_per_input:limit}}};
 }
 function normalize(raw,plan){
  if(!Array.isArray(raw))throw new HttpError(502,'Не удалось прочитать результат источника.');const good=raw.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!r.error&&!r.error_code);
  const text=(v,max=200)=>{if(v===undefined||v===null||typeof v==='object')return '—';let s=String(v).slice(0,max).replace(/[\u0000-\u001f]/g,' ');while(Buffer.byteLength(s)>max)s=s.slice(0,-1);return s||'—';};const first=(r,keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&v!==null&&v!=='');
  const rows=good.slice(0,plan.limit).map(r=>{const url=first(r,['url','post_url','profile_url','video_url']);const sourceItems=Array.isArray(r.citations)?r.citations:Array.isArray(r.references)?r.references:[];const sources=sourceItems.slice(0,10).map(x=>typeof x==='string'?x:typeof x==='object'&&x?x.url||x.link||x.title||'':'').filter(Boolean).join(' | ');const fields={'Название':text(first(r,['name','title','full_name','account','channel_name'])),'Автор':text(first(r,['author','author_name','user_name','username','user_posted','channel_name'])),'Описание':text(first(r,['biography','bio','about','description'])),'Текст':text(first(r,['text','content','description','caption','post_text'])),'Подписчики':text(first(r,['followers','followers_count','subscriber_count','subscribers'])),'Просмотры':text(first(r,['views','view_count','video_view_count'])),'Реакции':text(first(r,['likes','like_count','num_likes','upvotes'])),'Комментарии':text(first(r,['comments','comments_count','num_comments','comment_count'])),'Дата':text(first(r,['date_posted','date','published_at','create_time'])),'Ссылка':typeof url==='string'&&url.length<=1500&&productLinkAllowed(url,product)?url:'—','Запрос':text(r.prompt,500),'Ответ':text(r.answer_text,6000),'Источники':text(sources,2000)};return Object.fromEntries(plan.columns.map(k=>[k,fields[k]||'—']));}).filter(r=>Object.values(r).some(v=>v!=='—'));
  return {mode:'live',synthetic:false,product:id,dataSource:product.dataSource,rows,title:plan.title,received:raw.length,errorRecords:raw.length-good.length,requested:plan.limit,notice:'Данные из '+product.dataSource+'. Это снимок конкретной выдачи. «—» — поле не получено; нули сохраняются. Текст может быть сокращён. Популярность инструмента не означает подтверждённые продажи Affsiwen.'};
 }
 function resolveChatAnswer(answer,messages=[]){if(answer?.status!=='ready')return answer;if(id==='chatgpt'){const last=messages.filter(m=>m.role==='user').at(-1)?.content||'';const exact=last.match(/(?:вопрос|запрос|prompt)[^«“"\n:]{0,80}:\s*[«“"]([^»”"]{2,2000})[»”"]/iu);return exact?{...answer,task:'search',value:exact[1],limit:1}:answer;}const matched=tasks.filter(t=>acceptsTaskUrl(answer.value,t.id));return matched.length===1?{...answer,task:matched[0].id}:answer;}
 return {id,product,tasks,resolveChatAnswer,markets:product.markets,inventory,available,prepare,normalize,acceptsUrl:v=>productLinkAllowed(v,product),urlPrompt:'на профиль или контент '+product.name,chatInstructions:(id==='chatgpt'?'Это продукт исследования ответов внешнего веб-поиска. Выбери task=search; value — самостоятельный вопрос. Если пользователь указал точную формулировку вопроса в кавычках, сохраняй её дословно. В остальных случаях предложи формулировку и дождись согласия перед status=ready. Согласуй 1 запись. Не отвечай на исследовательский вопрос вместо подготовки сбора. Источники требуются; данные не гарантируют одинаковый ответ при повторе.':'Только публичные ссылки, строго в пределах подключённых типов. Выбирай тип по ссылке клиента, не выдумывай URL, профили или показатели. Для профиля, компании или конкретной публикации/видео обычно 1 запись; для публикаций страницы Facebook уточни число публикаций. Массовый поиск по словам, закрытые аккаунты, личные сообщения и отдельный анализ тональности пока не подключены.')+' GLOBAL — внутреннее значение, не спрашивай рынок. Покажи, что данные поступят из '+product.dataSource+'. Не утверждай, что продукт лучше продаётся или лидирует по продажам. Не оценивай личные качества людей и не делай выводов о чувствительных характеристиках.',publicConnection:inv=>({connected:inv.connected,reason:inv.reason,product:product.name,category:product.category,dataSource:product.dataSource,checkedAt:new Date().toISOString(),tasks:tasks.map(({id,title,description})=>({id,title,description,available:available(inv).some(t=>t.id===id)}))})};
}
