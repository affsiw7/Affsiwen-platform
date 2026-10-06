import {HttpError} from './errors.mjs';
import {commerceProduct,commerceProducts,productLinkAllowed} from '../dist/commerce-catalog.js';
import {normalizeAmazonResults} from './amazon-run.mjs';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
// Observed in the authorized supplier console, 2026-10-06. Not client-visible.
const definitions={
 walmart:{domain:'walmart.com',products:'gd_l95fol7l1ru6rlo116',reviews:'gd_mpql1v8g2o8o6l1wzd',sellers:'gd_m7ke48w81ocyu4hhz0',methods:{search:'keyword',category:'category_url',sku:'sku'}},
 ebay:{domain:'ebay.com',products:'gd_ltr9mjt81n0zzdk1fb',methods:{search:'keywords',category:'category','seller-products':'shop_url'}},
 etsy:{domain:'etsy.com',products:'gd_ltppk0jdv1jqz25mz',methods:{search:'keywords','seller-products':'shop_url'}},
 aliexpress:{domain:'aliexpress.us',products:'gd_mlj9v75u1w1jvaxvwp',methods:{category:'category_url'}},
 target:{domain:'target.com',products:'gd_ltppk5mx2lp0v1k0vo',methods:{search:'keywords',upc:'upc',category:'url'}},
 bestbuy:{domain:'bestbuy.com',products:'gd_ltre1jqe1jfr7cccf',methods:{search:'keywords'}}
};
const taskCopy={products:['Карточка товара','Данные товара по его ссылке.'],search:['Найти товары','Товары по точной поисковой фразе.'],reviews:['Собрать отзывы','Отзывы по ссылке на товар.'],sellers:['Изучить продавца','Публичная информация о продавце по ссылке.'],category:['Товары категории','Предложения по ссылке на категорию.'],'seller-products':['Ассортимент магазина','Товары по ссылке на магазин.'],sku:['Найти по SKU','Товар по идентификатору SKU.'],upc:['Найти по UPC','Товар по штрихкоду UPC.']};
const columns={products:['Товар','ID товара','Цена','Валюта','Рейтинг','Ссылка'],reviews:['Товар','Оценка','Заголовок отзыва','Текст отзыва','Дата','Ссылка'],sellers:['Продавец','Рейтинг','Публичная информация','Ссылка']};
const cache=new Map();
export function commerceAdapter(id){
 const definition=definitions[id],product=commerceProduct(id);if(!definition||!product)return null;
 const tasks=Object.entries({...Object.fromEntries(Object.entries(definition.methods).map(([task,method])=>[task,{family:'products',method:'discover_by_'+method}])),products:{family:'products',method:'collect_by_url'},...(definition.reviews?{reviews:{family:'reviews',method:'collect_by_url'}}:{}),...(definition.sellers?{sellers:{family:'sellers',method:'collect_by_url'}}:{})}).map(([id,mapping])=>({id,title:taskCopy[id][0],description:taskCopy[id][1],...mapping}));
 async function inventory({key,fetcher=fetch,now=Date.now()}={}){
  if(!key)return {connected:false,reason:'not_configured',inventory:[]};
  const hit=cache.get(id);if(hit?.key===key&&hit.fetcher===fetcher&&hit.until>now)return hit.value;
  let value;try{const r=await fetcher('https://api.brightdata.com/datasets/v3/scrapers?domain='+definition.domain,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});const body=r.ok?await r.json():null;const rows=Array.isArray(body)?body.filter(x=>x&&[definition.products,definition.reviews,definition.sellers].includes(x.id)&&x.scrapers):[];value={connected:rows.length>0,reason:rows.length?'verified':'unavailable',inventory:rows};}catch{value={connected:false,reason:'unavailable',inventory:[]};}cache.set(id,{key,fetcher,until:now+(value.connected?300000:15000),value});return value;
 }
 function available(inv){return tasks.filter(t=>inv.inventory?.some(x=>x.id===definition[t.family]&&x.scrapers?.[t.method]));}
 function prepare(data,inv){
  check(data&&typeof data==='object','Некорректное задание.');const task=tasks.find(t=>t.id===data.task);check(task,'Эта задача не поддерживается в '+product.name+'.');
  const market=data.market||product.markets[0];check(product.markets.includes(market),'Этот рынок ещё не подключён.');if(['reviews','sellers'].includes(task.id))check(market==='US','Эта операция пока подключена для рынка США.');
  const limit=Number(data.limit);check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Объём: от 1 до 100 записей.');
  const value=String(data.value||'').trim(),request=String(data.request||'').trim(),zipcode=String(data.zipcode||'').trim();check(value.length>=2&&value.length<=2000&&request.length>=2&&request.length<=2000,'Нужны цель и параметры запроса.');check(zipcode.length<=20,'Почтовый индекс слишком длинный.');
  if(!inv.connected)throw new HttpError(503,'Подключение данных временно недоступно.');
  const row=inv.inventory.find(x=>x.id===definition[task.family]),contract=row?.scrapers?.[task.method];check(contract&&Array.isArray(contract.input_schema)&&contract.input_schema.length,'Эта операция сейчас недоступна.');
  const keyword=task.id==='search',code=['upc','sku'].includes(task.id);let sourceUrl=null;
  if(!keyword&&!code){check(productLinkAllowed(value,product),'Пришлите обычную HTTPS-ссылку '+product.name+'.');const u=new URL(value);check(id!=='walmart'||u.hostname.replace(/^www\./,'')===(market==='CA'?'walmart.ca':'walmart.com'),'Ссылка не совпадает с рынком Walmart.');u.hash='';sourceUrl=u.href;}
  if(task.id==='upc')check(/^\d{8,14}$/.test(value),'UPC: от 8 до 14 цифр.');if(task.id==='sku')check(/^[A-Za-z0-9_-]{2,80}$/.test(value),'Укажите корректный SKU.');
  const domain='https://www.'+(id==='walmart'&&market==='CA'?'walmart.ca':definition.domain)+'/';
  const supplied={url:sourceUrl,category_url:sourceUrl,shop_url:sourceUrl,keyword:value,keywords:value,sku:value,upc:value,domain,country:market,zipcode,pages_to_search:1,begin_page:1,max_product:limit,max_reviews:limit,sort_by:'Most recent',all_variations:false,variation_specific:false,reviews_to_not_include:[]};
  const input={},missing=[];for(const f of contract.input_schema){if(typeof f.name!=='string')continue;const v=supplied[f.name];if(v!==undefined&&v!==null&&(v!==''||(f.name==='zipcode'&&!f.required)))input[f.name]=v;else if(f.required===true)missing.push(f.name==='zipcode'?'почтовый индекс':'дополнительный параметр');}
  check(!missing.length,'Нужно уточнить: '+missing.join(', '));check(Object.keys(input).some(k=>['url','category_url','shop_url','keyword','keywords','sku','upc'].includes(k)),'Операция требует дополнительной настройки.');
  const query={dataset_id:row.id,include_errors:'true',notify:'false'};if(task.method!=='collect_by_url'){query.type='discover_new';query.discover_by=task.method.replace('discover_by_','');}
  return {display:{product:id,task:task.id,title:task.title,market,limit,request,value,zipcode,columns:columns[task.id]||columns.products,mode:'prepared',priceStatus:'not_approved',notice:'Поля зависят от доступной выдачи. Стоимость услуги ещё рассчитывается.'},contract:{query,body:{input:[input],limit_per_input:limit}}};
 }
 function normalize(raw,plan){
  const result=normalizeAmazonResults(raw,plan,{linkAllowed:v=>productLinkAllowed(v,product)});return {...result,product:id};
 }
 return {id,product,tasks,acceptsUrl:value=>productLinkAllowed(value,product),markets:product.markets,inventory,available,prepare,normalize,publicConnection:inv=>({connected:inv.connected,reason:inv.reason,product:product.name,category:'E-commerce',checkedAt:new Date().toISOString(),tasks:tasks.map(({id,title,description})=>({id,title,description,available:available(inv).some(t=>t.id===id)}))})};
}
export const commerceIds=commerceProducts.filter(p=>p.id!=='amazon').map(p=>p.id);
