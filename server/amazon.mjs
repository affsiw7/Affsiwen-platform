import {HttpError} from './errors.mjs';
// Verified in the supplier console and official API docs on 2026-10-06.
// Provider identifiers stay server-side. Never serialize the raw inventory to buyers.
const BASE='https://api.brightdata.com';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
const families={products:'gd_l7q7dkf244hwjntr0',reviews:'gd_le8e811kzy4ggddlq',sellers:'gd_lhotzucw1etoe5iw1k',global:'gd_lwhideng15g8jg63s7'};
export const amazonTasks=[
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
