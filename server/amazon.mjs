import {HttpError} from './errors.mjs';
// Verified in the supplier console and official API docs on 2026-10-06.
// Provider identifiers stay server-side. Never serialize the raw inventory to buyers.
const BASE='https://api.brightdata.com';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
const families={products:'gd_l7q7dkf244hwjntr0',reviews:'gd_le8e811kzy4ggddlq',sellers:'gd_lhotzucw1etoe5iw1k',global:'gd_lwhideng15g8jg63s7',searchResults:'gd_lwdb4vjm1ehb499uxs'};
export const amazonTasks=[
 {id:'search-results',title:'Поисковая выдача Amazon',description:'Результаты поиска по заданной фразе.',family:'searchResults',method:'collect_by_url'},
 {id:'search',title:'Найти товары',description:'По ключевым словам: карточки, цены и рейтинги.',family:'products',method:'discover_by_keyword'},
 {id:'products',title:'Получить карточки товаров',description:'По ссылкам: характеристики, цены и доступность.',family:'products',method:'collect_by_url'},
 {id:'reviews',title:'Собрать отзывы',description:'Отзывы выбранного товара для разбора обратной связи.',family:'reviews',method:'collect_by_url'},
 {id:'sellers',title:'Изучить продавца',description:'Публичная информация о выбранном продавце.',family:'sellers',method:'collect_by_url'},
 {id:'bestsellers',title:'Посмотреть бестселлеры',description:'Товары из выбранного раздела Best Sellers.',family:'products',method:'discover_by_best_sellers_url'},
 {id:'category',title:'Собрать категорию',description:'Товары из конкретной категории Amazon.',family:'products',method:'discover_by_category_url'},
 {id:'brand',title:'Изучить бренд',description:'Товары по ссылке на страницу бренда.',family:'global',method:'discover_by_brand'},
 {id:'seller-products',title:'Товары продавца',description:'Ассортимент по ссылке на продавца.',family:'global',method:'discover_by_seller'},
 {id:'upc',title:'Найти по штрихкоду',description:'Поиск товаров по UPC.',family:'products',method:'discover_by_upc'}
];
let cache=null,inFlight=null;
export async function amazonInventory({key,fetcher=fetch,now=Date.now()}={}){
 if(!key)return {connected:false,reason:'not_configured',inventory:[]};
 if(cache&&cache.key===key&&cache.fetcher===fetcher&&cache.until>now)return cache.value;
 if(inFlight&&inFlight.key===key&&inFlight.fetcher===fetcher)return inFlight.promise;
 const promise=(async()=>{
  try{
   const response=await fetcher(`${BASE}/datasets/v3/scrapers?domain=amazon.com`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});
   if(!response.ok)return {connected:false,reason:[401,403].includes(response.status)?'access_denied':'unavailable',inventory:[]};
   const body=await response.json();if(!Array.isArray(body))return {connected:false,reason:'invalid_response',inventory:[]};
   const inventory=body.filter(x=>x&&Object.values(families).includes(x.id)&&x.scrapers&&typeof x.scrapers==='object');
   return {connected:inventory.length>0,reason:inventory.length?'verified':'no_amazon_access',inventory};
  }catch{return {connected:false,reason:'unavailable',inventory:[]};}
 })();
 inFlight={key,fetcher,promise};const value=await promise;cache={key,fetcher,value,until:now+(value.connected?300000:15000)};inFlight=null;return value;
}
export function publicAmazonConnection(result){
 return {connected:result.connected,reason:result.reason,checkedAt:new Date().toISOString(),category:'E-commerce',product:'Amazon',execution:'not_enabled',tasks:amazonTasks.map(({family,method,...task})=>({...task,available:!!result.inventory.find(x=>x.id===families[family])?.scrapers?.[method]}))};
}
const markets={US:'www.amazon.com',DE:'www.amazon.de',GB:'www.amazon.co.uk',FR:'www.amazon.fr',ES:'www.amazon.es',IT:'www.amazon.it',CA:'www.amazon.ca',AU:'www.amazon.com.au'};
const fieldNames={url:'Ссылка Amazon',keyword:'Поисковая фраза',keywords:'Поисковая фраза',upc:'Штрихкод UPC',domain:'Рынок Amazon',country:'Страна',zipcode:'Почтовый индекс',max_reviews:'Максимум отзывов',language:'Язык'};
const outputs={'search-results':['Товар','Позиция','Цена','Рейтинг','Ссылка'],search:['Товар','ASIN','Цена','Валюта','Рейтинг','Ссылка'],products:['Товар','ASIN','Цена','Валюта','Рейтинг','Ссылка'],reviews:['Товар','Оценка','Заголовок отзыва','Текст отзыва','Дата','Ссылка'],sellers:['Продавец','Рейтинг','Публичная информация','Ссылка'],bestsellers:['Товар','Категория','Место в списке','Цена','Ссылка'],category:['Товар','ASIN','Цена','Категория','Ссылка'],brand:['Товар','Бренд','Цена','Ссылка'],'seller-products':['Товар','Продавец','Цена','Ссылка'],upc:['Товар','UPC','ASIN','Цена','Ссылка']};
function safeAmazonUrl(value,market){
 let url;try{url=new URL(value);}catch{throw new HttpError(400,'Укажите полную ссылку Amazon, начиная с https://.');}
 check(url.protocol==='https:'&&!url.username&&!url.password&&!url.port,'Нужна обычная HTTPS-ссылка Amazon.');
 const host=url.hostname.replace(/^www\./,'');check(Object.values(markets).some(m=>m.replace(/^www\./,'')===host),'Поддерживаются только ссылки выбранных рынков Amazon.');
 check(host===markets[market].replace(/^www\./,''),'Домен ссылки не совпадает с выбранным рынком Amazon.');
 url.hash='';return url.href;
}
export function prepareAmazon(data,result){
 check(data&&typeof data==='object'&&!Array.isArray(data),'Некорректное задание.');
 const task=amazonTasks.find(x=>x.id===data.task);check(task,'Выберите задачу Amazon.');
 const market=data.market||'US';check(Object.hasOwn(markets,market),'Выберите доступный рынок Amazon.');
 const limit=Number(data.limit);check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Объём: от 1 до 100 записей.');
 const request=String(data.request||'').trim();check(request.length>=2&&request.length<=2000,'Опишите запрос: от 2 до 2000 символов.');
 const value=String(data.value||'').trim();check(value.length>=2&&value.length<=2000,task.id==='search'?'Укажите поисковую фразу для Amazon.':'Укажите ссылку или идентификатор для выбранной задачи.');
 if(!result.connected)throw new HttpError(503,'Подключение источника сейчас недоступно. Попробуйте позже.');
 let family=task.family,method=task.method;
 if(market!=='US'&&family==='products'&&task.id!=='upc'){family='global';if(task.id==='search')method='discover_by_keywords';}
 const scraper=result.inventory.find(x=>x.id===families[family]),contract=scraper?.scrapers?.[method];
 check(contract,'Эта задача пока не подтверждена для выбранного рынка. Выберите другой режим.');
 const schema=contract.input_schema;check(Array.isArray(schema)&&schema.length>0,'Параметры этой задачи ещё проверяются.');
 const url=task.id==='search-results'?`https://${markets[market]}`:task.id==='search'||task.id==='upc'?null:safeAmazonUrl(value,market);
 if(task.id==='upc'){check(market==='US','Поиск по UPC пока подтверждён только для Amazon US.');check(/^\d{8,14}$/.test(value),'UPC должен содержать от 8 до 14 цифр.');}
 const supplied={url,keyword:value,keywords:value,upc:value,pages_to_search:1,domain:`https://${markets[market]}`,country:market,zipcode:String(data.zipcode||'').trim(),max_reviews:limit,variation_specific:false,all_variations:false,reviews_to_not_include:[]};
 check(supplied.zipcode.length<=20,'Почтовый индекс слишком длинный.');
 const input={},missing=[];
 for(const field of schema){
  if(typeof field.name!=='string')continue;
  const v=supplied[field.name];
  if(v!==undefined&&v!==null&&v!=='')input[field.name]=v;
  else if(field.required===true)missing.push(fieldNames[field.name]||'Дополнительный параметр источника');
 }
 check(!missing.length,'Нужно уточнить: '+missing.join(', ')+'.');
 check(Object.keys(input).some(k=>['url','keyword','keywords','upc'].includes(k)),'Параметры этой операции требуют дополнительной настройки.');
 // Exactly one source input. Variations and broad expansions are never silently enabled.
 const query={dataset_id:scraper.id,include_errors:'true',notify:'false'};
 if(method!=='collect_by_url'){query.type='discover_new';query.discover_by=method.replace(/^discover_by_/,'');}
 const display={task:task.id,title:task.title,market,limit,request,value,zipcode:supplied.zipcode,columns:outputs[task.id],mode:'prepared',priceStatus:'not_approved',notice:'Параметры проверены. Оплата и реальный запуск пока не включены. Доступность полей зависит от источника.'};
 return {display,contract:{query,body:{input:[input],limit_per_input:limit}}};
}
export function amazonDemoRows(plan){
 return Array.from({length:Math.min(plan.limit,5)},(_,i)=>Object.fromEntries(plan.columns.map((name,j)=>[name,name==='Ссылка'?`https://example.com/amazon-demo/${i+1}`:name==='Валюта'?'DEMO':name==='Цена'?'Условная цена':name==='Оценка'||name==='Рейтинг'?'Демо':`${j===0?'Демо-объект':'Пример'} ${i+1}`])));
}
