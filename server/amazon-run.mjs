import {createHmac} from 'node:crypto';
import {HttpError} from './errors.mjs';
import {prepareAmazon,amazonInventory} from './amazon.mjs';
const BASE='https://api.brightdata.com/datasets/v3';
const fail=(ok,status,message)=>{if(!ok)throw new HttpError(status,message);};
const sign=(key,text)=>createHmac('sha256',key).update(text).digest('hex');
const terminal=new Set(['ready','empty','failed','unknown','reserved']);
export function runConfiguration(env){return {enabled:env.AFFSIWEN_AMAZON_RUN_ENABLED==='yes'&&!!env.BRIGHT_DATA_API_KEY,maxRecords:10,maxRunsPerDay:Math.min(3,Math.max(0,Number(env.AFFSIWEN_AMAZON_RUNS_PER_DAY)||0))};}
export function publicRun(job){
 if(!job)return null;
 const labels={reserved:'Подготовка запуска. Не отправляйте повторно.',starting:'Запрос отправляется.',running:'Собираем данные Amazon.',ready:'Результат готов.',empty:'Сбор завершён, подходящие записи не найдены.',failed:'Сбор не завершился. Повторного платного запуска не было.',unknown:'Не удалось подтвердить запуск. Нужна сверка; повторный запуск заблокирован.'};
 return {id:job.id,status:job.status,message:labels[job.status]||'Проверяем результат.',createdAt:job.createdAt,updatedAt:job.updatedAt,planId:job.plan.id,task:job.plan.title,requested:job.plan.limit,result:job.result||null};
}
async function jsonBounded(response,max=2097152){
 const length=Number(response.headers?.get('content-length')||0);if(length>max)throw Error('response too large');
 if(!response.body?.getReader){const data=await response.json();if(Buffer.byteLength(JSON.stringify(data))>max)throw Error('response too large');return data;}
 const reader=response.body.getReader();let size=0,chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('response too large');}chunks.push(Buffer.from(value));}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const text=(v,max=300)=>{if(v===undefined||v===null)return '—';if(typeof v==='object')v=v.value??v.amount??v.text??v.name??null;if(v===null||typeof v==='object')return '—';let s=String(v);while(Buffer.byteLength(s)>max)s=s.slice(0,-1);return s||'—';};
const first=(r,keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&v!==null&&v!=='');
export function normalizeAmazonResults(raw,plan){
 fail(Array.isArray(raw),502,'Источник вернул непонятный формат. Платного повтора не было.');
 const good=raw.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!r.error&&!r.error_code);
 const rows=good.slice(0,plan.limit).map(r=>{
  let url=text(first(r,['url','product_url','review_url','seller_url']),1000);try{const u=new URL(url);if(u.protocol!=='https:'||!/(^|\.)amazon\.(com|de|co\.uk|fr|es|it|ca|com\.au)$/.test(u.hostname)||u.username||u.password)url='—';}catch{url='—';}
  const fields={
   'Товар':text(first(r,['title','product_name','name','product_title'])),
   'ASIN':text(first(r,['asin','product_asin'])),'Цена':text(first(r,['final_price','price','current_price','initial_price'])),
   'Валюта':text(first(r,['currency','currency_symbol'])),'Рейтинг':text(first(r,['rating','product_rating','seller_rating'])),
   'Ссылка':url,'Позиция':text(first(r,['position','rank','rank_in_search','search_position'])),
   'Оценка':text(first(r,['rating','review_rating'])),'Заголовок отзыва':text(first(r,['review_title','title'])),
   'Текст отзыва':text(first(r,['review_text','content','text','review_content']),800),'Дата':text(first(r,['review_date','date','date_of_review'])),
   'Продавец':text(first(r,['seller_name','name','seller'])),'Публичная информация':text(first(r,['business_name','business_address','about','description']),500),
   'Категория':text(first(r,['category','root_bs_category'])),'Место в списке':text(first(r,['rank','position','bs_rank','root_bs_rank'])),
   'Бренд':text(first(r,['brand','brand_name'])),'UPC':text(first(r,['upc']))
  };
  return Object.fromEntries(plan.columns.map(k=>[k,fields[k]||'—']));
 }).filter(r=>Object.values(r).some(v=>v!=='—'));
 return {mode:'live',synthetic:false,rows,title:plan.title,received:raw.length,errorRecords:raw.length-good.length,requested:plan.limit,notice:'Данные получены по этому запросу. «—» означает, что поле не получено. Текстовые поля сокращены для таблицы; выдача может быть меньше запрошенного объёма.'};
}
export function createAmazonRunner({env,fetcher=fetch,read,write,now=()=>Date.now()}){
 const config=runConfiguration(env),key=env.BRIGHT_DATA_API_KEY;
 const jobKey=(capability,id)=>sign(key,'amazon-run-v1:'+capability+':'+id);
 const get=async(capability,id)=>{fail(/^[a-f0-9]{64}$/.test(capability)&&/^[a-f0-9]{32}$/.test(id),400,'Некорректное задание.');return read(jobKey(capability,id));};
 const save=(capability,id,document,revision)=>write(jobKey(capability,id),{...document,messages:[],updatedAt:new Date(now()).toISOString()},revision);
 async function start(capability,plan){
  fail(config.enabled&&config.maxRunsPerDay>0,503,'Реальный сбор ещё не включён.');
  fail(plan&&/^[a-f0-9]{32}$/.test(plan.id),409,'Подготовьте запрос в чате.');
  fail(Number.isInteger(plan.limit)&&plan.limit>=1&&plan.limit<=config.maxRecords,400,`Для пробного запуска нужен объём от 1 до ${config.maxRecords} записей.`);
  // Never trust caller-editable intake documents or client-supplied provider contracts.
  const prepared=prepareAmazon(plan,await amazonInventory({key,fetcher}));
  const stored=await get(capability,plan.id);if(stored.document)return publicRun(stored.document);
  const job={id:plan.id,plan:{...prepared.display,id:plan.id},status:'reserved',createdAt:new Date(now()).toISOString(),snapshot:null,result:null};
  const initial=await save(capability,plan.id,job,stored.revision);
  // The revision lock above admits exactly one trigger attempt for this plan.
  const day=new Date(now()).toISOString().slice(0,10),budgetKey=sign(key,'amazon-run-budget-v1:'+day);
  try{
   const budget=await read(budgetKey),used=budget.document?.runs||0;
   fail(used<config.maxRunsPerDay,429,'Пробный лимит сборов на сегодня исчерпан. Повторного запуска не было.');
   await write(budgetKey,{messages:[],runs:used+1,reservedMicroUsd:(used+1)*250000},budget.revision);
  }catch(e){await save(capability,plan.id,{...job,status:'failed'},initial.revision).catch(()=>{});throw e;}
  const sending=await save(capability,plan.id,{...job,status:'starting'},initial.revision);
  const query=new URLSearchParams({...prepared.contract.query,limit_per_input:String(plan.limit),limit_multiple_results:String(plan.limit)});
  let next;
  try{
   const response=await fetcher(`${BASE}/trigger?${query}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(prepared.contract.body),signal:AbortSignal.timeout(20000),redirect:'error'});
   if(!response.ok){next={...job,status:response.status>=400&&response.status<500?'failed':'unknown'};}
   else{const out=await jsonBounded(response,20000);next=/^s[d]?_[A-Za-z0-9_-]{5,100}$/.test(out.snapshot_id||'')?{...job,status:'running',snapshot:out.snapshot_id}:{...job,status:'unknown'};}
  }catch{next={...job,status:'unknown'};}
  // A failed persistence after supplier acceptance must never cause another POST.
  try{const saved=await save(capability,plan.id,next,sending.revision);return publicRun(saved.document);}catch{return publicRun({...job,status:'unknown'});}
 }
 async function status(capability,id){
  fail(key,503,'Подключение источника недоступно.');
  const stored=await get(capability,id),job=stored.document;fail(job,404,'Задание не найдено в этой сессии.');
  if(terminal.has(job.status))return publicRun(job);
  if(job.status==='starting')return publicRun({...job,status:now()-Date.parse(job.createdAt)>60000?'unknown':'starting'});
  if(!job.snapshot)return publicRun({...job,status:'unknown'});
  if(now()-Number(job.lastPollAt||0)<8000)return publicRun(job);
  // Reserve the poll to keep concurrent tabs from hitting the supplier repeatedly.
  let lock;try{lock=await save(capability,id,{...job,lastPollAt:now()},stored.revision);}catch(e){if(e.status===409)return publicRun((await get(capability,id)).document);throw e;}
  let next={...job,lastPollAt:now()};
  try{
   const response=await fetcher(`${BASE}/progress/${job.snapshot}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000),redirect:'error'});
   if(response.ok){const progress=await jsonBounded(response,20000);
    if(progress.status==='failed')next.status='failed';
    else if(progress.status==='ready'){
     const resultResponse=await fetcher(`${BASE}/snapshot/${job.snapshot}?format=json`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});
     if(resultResponse.ok&&resultResponse.status!==202){const result=normalizeAmazonResults(await jsonBounded(resultResponse),job.plan);next={...next,status:result.rows.length?'ready':result.received?'failed':'empty',result:{...result,createdAt:new Date(now()).toISOString()}};}
    }
   }
  }catch{/* Read-only failures keep the saved run recoverable; never retry a trigger. */}
  try{return publicRun((await save(capability,id,next,lock.revision)).document);}catch{return publicRun(next);}
 }
 return {start,status,read:async(cap,id)=>publicRun((await get(cap,id)).document)};
}
